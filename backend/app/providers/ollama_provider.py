import os
import httpx
from app.config import ConfigError, required_env
from app.providers.base import BaseProvider
from app.providers.errors import (
    ProviderConnectionError, ProviderResponseError, ProviderTimeoutError, ProviderUpstreamError,
)


class OllamaProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__('ollama', required_env('OLLAMA_MODEL'))
        base_url = os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434').strip().rstrip('/')
        try:
            url = httpx.URL(base_url)
        except httpx.InvalidURL as exc:
            raise ConfigError('OLLAMA_BASE_URL은 유효한 HTTP(S) URL이어야 합니다.') from exc
        if url.scheme not in ('http', 'https') or not url.host:
            raise ConfigError('OLLAMA_BASE_URL은 유효한 HTTP(S) URL이어야 합니다.')
        # 프론트 요청 제한(45초)보다 먼저 끝나야 사용자가 서버의 안내 문구를 본다. OpenAI와 같은 35초다.
        self._client = httpx.Client(base_url=base_url, timeout=35.0)

    def close(self) -> None:
        self._client.close()

    def _generate(self, message: str, schema: dict | None) -> str:
        body = {'model': self._model, 'messages': [{'role': 'user', 'content': message}], 'stream': False}
        if schema is not None:
            body['format'] = schema
        try:
            response = self._client.post('/api/chat', json=body)
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError() from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderUpstreamError(f'Ollama HTTP {exc.response.status_code}') from exc
        except httpx.RequestError as exc:
            raise ProviderConnectionError() from exc
        try:
            content = response.json()['message']['content']
        except (ValueError, TypeError, KeyError) as exc:
            raise ProviderResponseError() from exc
        if not isinstance(content, str) or not content.strip():
            raise ProviderResponseError()
        return content
