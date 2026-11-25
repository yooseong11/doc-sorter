"""페이지마다 직접 추출 또는 OCR을 선택한다. PDF 문서는 worker 안에서만 연다."""
import math
import unicodedata

import pymupdf
from PIL import Image

from ..config import OcrSettings
from ..ocr_errors import OcrError
from .ocr_service import recognize, reconstruct_text
from ..schemas import BoundingBox, PageResult, WordResult


def direct_is_usable(page, raw_words, settings: OcrSettings) -> bool:
    text = ''.join(str(word[4]) for word in raw_words)
    visible = [char for char in text if not char.isspace()]
    if len(visible) < settings.direct_min_chars:
        return False
    valid = sum(char != '\ufffd' and not unicodedata.category(char).startswith('C') for char in visible)
    if valid / len(visible) < settings.direct_min_quality:
        return False
    # 제목만 텍스트이고 본문은 스캔인 페이지도 OCR한다.
    # 큰 이미지에 직접 텍스트가 충분히 겹치는 기존 OCR PDF는 재인식을 피한다.
    for info in page.get_image_info():
        image_rect = pymupdf.Rect(info['bbox'])
        if image_rect.is_empty or image_rect.get_area() / page.rect.get_area() < settings.uncovered_image_ratio:
            continue
        covering = [word for word in raw_words if pymupdf.Rect(word[:4]).intersects(image_rect)]
        covered_area = sum((pymupdf.Rect(word[:4]) & image_rect).get_area() for word in covering)
        if covered_area / image_rect.get_area() < 0.01:
            return False
    return True


def direct_page(page, number: int, raw_words) -> PageResult:
    # PyMuPDF words는 block/line/word 정보만 제공한다. paragraph는 0(알 수 없음).
    words = [WordResult(text=raw[4], confidence=None,
        bbox=BoundingBox(left=raw[0], top=raw[1], width=raw[2]-raw[0], height=raw[3]-raw[1]),
        block=raw[5], paragraph=0, line=raw[6], page_num=number, needs_review=False)
        for raw in raw_words if raw[4].strip()]
    return PageResult(page=number, method='direct', text=reconstruct_text(words),
        coordinate_space='pdf_page_pt', words=words,
        geometry={'pdf_page_size': {'width': page.cropbox.width, 'height': page.cropbox.height},
                  'pdf_rotation_clockwise_degrees': page.rotation,
                  'pdf_cropbox': list(page.cropbox),
                  'coordinate_convention': 'unrotated page; top-left origin; points (1/72 inch)',
                  'paragraph_available': False})


def process_pdf(content: bytes, settings: OcrSettings) -> list[PageResult]:
    try:
        document = pymupdf.open(stream=content, filetype='pdf')
    except (pymupdf.FileDataError, RuntimeError, ValueError) as exc:
        raise OcrError('invalid_pdf', 'PDF가 손상되었거나 읽을 수 없습니다.') from exc
    with document:
        if document.needs_pass:
            raise OcrError('encrypted_pdf', '암호화된 PDF는 지원하지 않습니다.')
        if not document.page_count:
            raise OcrError('empty_pdf', 'PDF에 페이지가 없습니다.')
        if document.page_count > settings.max_pages:
            raise OcrError('too_many_pages', f'PDF는 {settings.max_pages}페이지까지 처리할 수 있습니다.', 413)
        results = []
        for index in range(document.page_count):
            try:
                page = document.load_page(index)
                raw_words = page.get_text('words', sort=True)
                if direct_is_usable(page, raw_words, settings):
                    result = direct_page(page, index + 1, raw_words)
                else:
                    scale = settings.dpi / 72
                    width, height = math.ceil(page.rect.width * scale), math.ceil(page.rect.height * scale)
                    if width * height > settings.max_image_pixels:
                        raise OcrError('image_too_large', 'PDF 렌더링 이미지의 픽셀 제한을 초과했습니다.', 413)
                    pixmap = page.get_pixmap(dpi=settings.dpi, colorspace=pymupdf.csRGB, alpha=False)
                    image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
                    result = recognize(image, index + 1, settings)
                    rotation = page.rotation_matrix
                    # 원본 raster는 회전된 CropBox의 0,0에서 시작한다.
                    result.geometry.update({
                        'dpi': settings.dpi,
                        'pdf_cropbox': list(page.cropbox),
                        'pdf_page_size': {'width': page.cropbox.width, 'height': page.cropbox.height},
                        'pdf_rotation_clockwise_degrees': page.rotation,
                        'pdf_page_to_original_image': [
                            [rotation.a * scale, rotation.c * scale, rotation.e * scale],
                            [rotation.b * scale, rotation.d * scale, rotation.f * scale], [0, 0, 1]],
                        'pdf_coordinate_convention': 'unrotated page; top-left origin; points (1/72 inch)',
                    })
                results.append(result)
            except OcrError as exc:
                # 엔진 미설치·언어 누락은 모든 OCR 페이지에 영향을 주므로 요청 오류로 보고한다.
                if exc.status == 503:
                    raise
                results.append(PageResult(page=index + 1, method='error', error=exc.code,
                                          warnings=[exc.message]))
            except Exception:
                results.append(PageResult(page=index + 1, method='error', error='page_failed',
                                          warnings=['이 페이지를 처리하지 못했습니다.']))
        return results
