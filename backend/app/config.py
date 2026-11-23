"""환경설정을 현재 프로젝트의 backend/.env에서 읽습니다."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / '.env')


def required_env(name: str) -> str:
    value = os.getenv(name, '').strip()
    if not value or value.startswith('<'):
        raise RuntimeError(f'설정이 필요합니다: {name}')
    return value
