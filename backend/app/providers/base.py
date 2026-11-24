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

    def _generate(self, message: str) -> str:
        raise NotImplementedError

    def generate(self, message: str) -> str:
        try:
            return self._generate(message)
        except AIProviderError as exc:
            logger.error('[%s:%s] %s', self._provider_name, self._model, exc)
            raise