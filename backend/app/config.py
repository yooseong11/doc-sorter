"""OCR 설정은 코드에서 관리하고, AI 제공자 설정은 backend/.env에서 읽습니다."""
import os
import math
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / '.env')


def required_env(name: str) -> str:
    value = os.getenv(name, '').strip()
    if not value or value.startswith('<'):
        raise RuntimeError(f'설정이 필요합니다: {name}')
    return value



@dataclass(frozen=True)
class OcrSettings:
    language: str = 'kor+eng'
    psm: int = 3
    dpi: int = 300
    confidence_threshold: float = 70
    osd_min_confidence: float = 15
    max_deskew_degrees: float = 10
    max_file_bytes: int = 25 * 1024 * 1024
    max_pages: int = 100
    max_image_pixels: int = 40_000_000
    page_timeout: float = 60
    document_timeout: float = 300
    direct_min_chars: int = 10
    direct_min_quality: float = 0.95
    uncovered_image_ratio: float = 0.2
    outputs_dir: Path = Path(__file__).resolve().parents[1] / 'outputs'

    def __post_init__(self):
        for value in (self.page_timeout, self.document_timeout, self.osd_min_confidence):
            if not math.isfinite(value):
                raise ValueError('OCR 시간·방향 신뢰도 설정은 유한한 수여야 합니다.')
        if not 72 <= self.dpi <= 600:
            raise ValueError('dpi는 72~600이어야 합니다.')
        if not 0 <= self.confidence_threshold <= 100:
            raise ValueError('confidence_threshold는 0~100이어야 합니다.')
        if min(self.max_file_bytes, self.max_pages, self.max_image_pixels, self.direct_min_chars) <= 0:
            raise ValueError('OCR 용량·페이지·픽셀·문자 제한은 양수여야 합니다.')
        if min(self.page_timeout, self.document_timeout) <= 0:
            raise ValueError('OCR 제한 시간은 양수여야 합니다.')
        if not 0 <= self.direct_min_quality <= 1 or not 0 <= self.uncovered_image_ratio <= 1:
            raise ValueError('OCR 품질·이미지 비율은 0~1이어야 합니다.')
        if not 0 <= self.max_deskew_degrees <= 15 or self.osd_min_confidence < 0:
            raise ValueError('OCR 회전 설정 범위를 확인하세요.')
