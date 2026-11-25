import logging

from app.providers.errors import AIProviderError

logger = logging.getLogger(__name__)


class BaseProvider:
    def __init__(self, provider_name: str, model: str) -> None:
        self._provider_name = provider_name
        self._model = model

    @property
    def provider_name(self) -> str:
        return self._provider_name

    @property
    def model_name(self) -> str:
        return self._model

    def _generate(self, message: str, schema: dict | None) -> str:
        raise NotImplementedError

    def generate(self, message: str, schema: dict | None = None) -> str:
        """schema를 주면 그 JSON Schema를 따르는 JSON 문자열을 요청한다. 스키마는 호출하는 쪽이 정한다."""
        try:
            return self._generate(message, schema)
        except AIProviderError as exc:
            # 원래 SDK·HTTP 예외(상태 코드, 요청 ID)를 함께 남겨야 401·404·429를 구분할 수 있다.
            logger.error('[%s:%s] %s', self._provider_name, self._model, exc, exc_info=exc.__cause__ or exc)
            raise
