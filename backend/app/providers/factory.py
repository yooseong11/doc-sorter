import os
from app.providers.base import AIProvider


def create_provider() -> AIProvider:
    provider_name = os.getenv('AI_PROVIDER', 'ollama').strip().lower()
    if provider_name == 'ollama':
        from app.providers.ollama_provider import OllamaProvider
        return OllamaProvider()
    if provider_name == 'openai':
        from app.providers.openai_provider import OpenAIProvider
        return OpenAIProvider()
    raise RuntimeError(f'지원하지 않는 Provider 설정: {provider_name}')
