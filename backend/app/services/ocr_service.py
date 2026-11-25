"""Tesseract 엔진 호출과 단어·행·검토 정보 구성."""
import math
import time
import pytesseract

from ..config import OcrSettings
from .image_service import preprocess
from ..ocr_errors import OcrError
from ..schemas import BoundingBox, PageResult, WordResult


def check_engine(settings: OcrSettings):
    try:
        pytesseract.get_tesseract_version()
        available = set(pytesseract.get_languages(config=''))
    except (pytesseract.TesseractNotFoundError, pytesseract.TesseractError, OSError) as exc:
        raise OcrError('engine_unavailable', 'Tesseract 실행 파일을 확인해 주세요.', 503) from exc
    missing = {'kor', 'eng', 'osd'} - available
    if missing:
        raise OcrError('language_missing', 'Tesseract 언어 데이터가 필요합니다: ' + ', '.join(sorted(missing)), 503)


def reconstruct_text(words: list[WordResult]) -> str:
    """엔진의 읽기 순서를 유지하고 블록·문단·행 경계로 줄바꿈을 복원한다."""
    text = ''
    previous = None
    for word in words:
        key = (word.block, word.paragraph, word.line)
        if previous is not None:
            text += ('\n\n' if key[:2] != previous[:2] else '\n') if key != previous else ' '
        text += word.text
        previous = key
    return text


def words_from_data(data: dict, settings: OcrSettings) -> list[WordResult]:
    words = []
    for index, raw in enumerate(data['text']):
        text = str(raw).strip()
        confidence = float(data['conf'][index])
        if not text or not math.isfinite(confidence) or confidence < 0 or int(data['level'][index]) != 5:
            continue
        words.append(WordResult(
            text=text, confidence=confidence,
            bbox=BoundingBox(**{key: int(data[key][index]) for key in ('left', 'top', 'width', 'height')}),
            block=int(data['block_num'][index]), paragraph=int(data['par_num'][index]),
            line=int(data['line_num'][index]), page_num=int(data['page_num'][index]),
            needs_review=confidence < settings.confidence_threshold))
    return words


def recognize(image, page_number: int, settings: OcrSettings) -> PageResult:
    check_engine(settings)
    started = time.monotonic()
    processed, geometry, notes = preprocess(image, settings, settings.page_timeout)
    try:
        remaining = settings.page_timeout - (time.monotonic() - started)
        if remaining <= 0:
            raise RuntimeError('Tesseract process timeout')
        data = pytesseract.image_to_data(processed, lang=settings.language,
            config=f'--psm {settings.psm}', output_type=pytesseract.Output.DICT, timeout=remaining)
    except pytesseract.TesseractError as exc:
        raise OcrError('ocr_failed', 'Tesseract가 페이지를 인식하지 못했습니다.') from exc
    except RuntimeError as exc:
        raise OcrError('ocr_timeout', '페이지 OCR 처리 시간이 초과되었습니다.', 504) from exc
    words = words_from_data(data, settings)
    if not words:
        notes.append('empty_text: 인식된 텍스트가 없습니다.')
    return PageResult(page=page_number, method='ocr', text=reconstruct_text(words),
        coordinate_space='processed_image_px', words=words, geometry=geometry, warnings=notes)
