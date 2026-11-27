"""API JSON 계약. 직접 추출 좌표는 회전 전 PDF 페이지의 point 단위다."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class Category(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=20)
    hint: str = Field(max_length=60)

    @field_validator('name')
    @classmethod
    def not_unclassified(cls, value):
        if value == '미분류':
            raise ValueError('미분류는 예약된 이름입니다.')
        return value


class ClassificationInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=255)
    text: str = Field(min_length=1, max_length=3000)
    categories: list[Category] = Field(min_length=1, max_length=8)

    @field_validator('categories')
    @classmethod
    def unique_names(cls, values):
        if len({value.name for value in values}) != len(values):
            raise ValueError('카테고리 이름이 겹칩니다.')
        return values


class ClassificationResult(BaseModel):
    model_config = ConfigDict(extra='forbid')
    category: str
    quote: str
    # 분류 조작 지시를 탐지해 AI 호출 없이 미분류로 보냈는지. 모델이 고른 미분류와 구분한다. (ADR 0027)
    flagged: bool = False
