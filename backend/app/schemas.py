"""OCR JSON 계약. 직접 추출 좌표는 회전 전 PDF 페이지의 point 단위다."""
from typing import Literal
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    left: float
    top: float
    width: float
    height: float


class WordResult(BaseModel):
    text: str
    confidence: float | None
    bbox: BoundingBox
    block: int
    paragraph: int
    line: int
    page_num: int
    needs_review: bool


class PageResult(BaseModel):
    page: int
    method: Literal['ocr', 'direct', 'error']
    text: str = ''
    coordinate_space: Literal['processed_image_px', 'pdf_page_pt'] | None = None
    words: list[WordResult] = Field(default_factory=list)
    geometry: dict = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    error: str | None = None


class DocumentResult(BaseModel):
    filename: str
    engine: str = 'tesseract'
    language: str = 'kor+eng'
    psm: int = 3
    confidence_threshold: float
    status: Literal['completed', 'partial', 'failed'] = 'completed'
    pages: list[PageResult]


class OcrResponse(BaseModel):
    processing_id: str
    text: str
    result: DocumentResult
    files: dict[str, str]
