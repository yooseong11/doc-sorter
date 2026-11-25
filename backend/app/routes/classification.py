"""문서 분류 API."""
from fastapi import APIRouter, HTTPException

from ..providers.base import BaseProvider
from ..providers.errors import AIProviderError, ProviderTimeoutError
from ..schemas import ClassificationInput, ClassificationResult
from ..services.classification_service import classify_document


def create_router(selected: BaseProvider | None) -> APIRouter:
    router = APIRouter()

    @router.post('/api/classify', response_model=ClassificationResult)
    def classify(body: ClassificationInput):
        if selected is None:
            raise HTTPException(503, detail={'message': '백엔드 .env의 AI_PROVIDER와 모델·API 키 설정을 확인해 주세요.'})
        try:
            return classify_document(body, selected)
        except ProviderTimeoutError as exc:
            raise HTTPException(504, detail={'message': 'AI 응답 시간이 초과되었습니다. 다시 시도해 주세요.'}) from exc
        except AIProviderError as exc:
            raise HTTPException(502, detail={'message': 'AI 분류에 실패했습니다. 연결 또는 모델 설정을 확인해 주세요.'}) from exc


    return router
