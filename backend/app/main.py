"""로컬 백엔드. 실행: python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from .config import ConfigError, OcrSettings
from .ocr_errors import OcrError
from .providers.base import BaseProvider
from .providers.errors import AIProviderError, ProviderTimeoutError
from .providers.factory import create_provider
from .schemas import ClassificationInput, ClassificationResult, OcrResponse
from .services.classification_service import classify_document
from .services.document_service import process_document, safe_filename

logger = logging.getLogger(__name__)


def create_app(provider: BaseProvider | None = None) -> FastAPI:
    """provider를 주면 그대로 쓰고(테스트), 없으면 backend/.env의 AI_PROVIDER로 고른다."""
    selected = provider
    if selected is None:
        try:
            selected = create_provider()
        except ConfigError as exc:
            # OCR은 AI 설정 없이도 써야 하므로 서버는 띄우고, 분류 요청만 503으로 안내한다.
            logger.warning('AI provider 설정 누락: %s', exc)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        if selected is not None:
            selected.close()

    api = FastAPI(lifespan=lifespan)

    @api.exception_handler(OcrError)
    async def ocr_error_handler(request: Request, error: OcrError):
        return JSONResponse(status_code=error.status,
                            content={'detail': {'code': error.code, 'message': error.message}})

    @api.get('/health')
    def check_health():
        # 실제 모델 호출이 아닌 설정 확인이다.
        if selected is None:
            return {'status': 'ok', 'provider': None, 'model': None}
        return {'status': 'ok', 'provider': selected.provider_name, 'model': selected.model_name}

    @api.post('/api/classify', response_model=ClassificationResult)
    def classify(body: ClassificationInput):
        if selected is None:
            raise HTTPException(503, detail={'message': '백엔드 .env의 AI_PROVIDER와 모델·API 키 설정을 확인해 주세요.'})
        try:
            return classify_document(body, selected)
        except ProviderTimeoutError as exc:
            raise HTTPException(504, detail={'message': 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.'}) from exc
        except AIProviderError as exc:
            raise HTTPException(502, detail={'message': 'AI 분류에 실패했습니다. 연결 또는 모델 설정을 확인해 주세요.'}) from exc

    @api.post('/api/ocr', response_model=OcrResponse)
    async def ocr(file: UploadFile):
        """파일 수신만 담당한다. 전처리·OCR·저장은 서비스가 수행한다."""
        try:
            settings = OcrSettings()
            filename = safe_filename(file.filename or '')
            content = bytearray()
            while chunk := await file.read(1024 * 1024):
                content.extend(chunk)
                if len(content) > settings.max_file_bytes:
                    raise OcrError('file_too_large', '파일 크기 제한을 초과했습니다.', 413)
            return await run_in_threadpool(process_document, bytes(content), filename, settings)
        finally:
            await file.close()

    return api
