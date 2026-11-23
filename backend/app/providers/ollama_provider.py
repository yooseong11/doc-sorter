import os
from app.config import required_env

class OllamaProvider:
    def __init__(self) -> None:
        self._model = required_env('OLLAMA_MODEL')
        self._base_url = os.getenv('OLLAMA_BASE_URL','http://127.0.0.1:11434').rstrip('/')