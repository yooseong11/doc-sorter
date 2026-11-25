from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from .config import ConfigError, OcrSettings
from .ocr_errors import OcrError
from .schemas import OcrResponse, ClassificationInput, ClassificationResult
from .services.document_service import process_document, safe_filename

from .services.classification_service import classify_document
from .providers.errors import AIProviderError, ProviderTimeoutError

app = FastAPI()


@app.exception_handler(OcrError)
async def ocr_error_handler(request: Request, error: OcrError):
    return JSONResponse(status_code=error.status,
                        content={'detail': {'code': error.code, 'message': error.message}})


@app.get('/health')
def check_health():
    return {'status': 'ok'}


@app.post('/api/classify', response_model=ClassificationResult)
def classify(body: ClassificationInput):
    try:
        return classify_document(body)
    except ProviderTimeoutError as exc:
        raise HTTPException(504, detail={'message': 'OpenAI 응답 시간이 초과되었습니다. 다시 시도해 주세요.'}) from exc
    except AIProviderError as exc:
        raise HTTPException(502, detail={'message': 'OpenAI 분류에 실패했습니다. 연결 또는 모델 설정을 확인해 주세요.'}) from exc
    except ConfigError as exc:
        raise HTTPException(503, detail={'message': '백엔드의 OPENAI_API_KEY와 OPENAI_MODEL 설정을 확인해 주세요.'}) from exc


@app.post('/api/ocr', response_model=OcrResponse)
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
