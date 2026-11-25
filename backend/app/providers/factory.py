import os
from app.config import ConfigError
from app.providers.base import BaseProvider


def create_provider() -> BaseProvider:
    provider_name = os.getenv('AI_PROVIDER', 'ollama').strip().lower()
    if provider_name == 'ollama':
        from app.providers.ollama_provider import OllamaProvider
        return OllamaProvider()
    if provider_name == 'openai':
        from app.providers.openai_provider import OpenAIProvider
        return OpenAIProvider()
    raise ConfigError(f'지원하지 않는 Provider 설정: {provider_name}')
