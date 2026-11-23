from app.config import required_env

class OpenAIProvider:
    def __init__(self) -> None:
        from openai import OpenAI
        self._model = required_env('OPENAI_MODEL')
        self._client = OpenAI(api_key=required_env('OPENAI_API_KEY'), timeout=60.0, max_retries=0)