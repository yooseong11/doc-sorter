"""로컬 백엔드. 실행: python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import ConfigError
from .ocr_errors import OcrError
from .providers.base import BaseProvider
from .providers.factory import create_provider
from .routes import classification, health, ocr

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

    api.include_router(health.create_router(selected))
    api.include_router(classification.create_router(selected))
    api.include_router(ocr.router)

    return api
