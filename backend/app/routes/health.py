"""서버와 AI 설정 상태 확인 API."""
from fastapi import APIRouter

from ..providers.base import BaseProvider


def create_router(selected: BaseProvider | None) -> APIRouter:
    router = APIRouter()

    @router.get('/health')
    def check_health():
        # 실제 모델 호출이 아닌 설정 확인이다.
        if selected is None:
            return {'status': 'ok', 'provider': None, 'model': None}
        return {'status': 'ok', 'provider': selected.provider_name, 'model': selected.model_name}


    return router
