"""처리별 UUID 폴더에 TXT/JSON을 함께 공개한다. 실패 시 임시 폴더 정리."""
import json
from pathlib import Path
import tempfile
from uuid import uuid4

from ..config import OcrSettings
from ..ocr_errors import OcrError
from ..schemas import DocumentResult, OcrResponse


def document_text(result: DocumentResult) -> str:
    # form-feed는 빈 페이지·실패 페이지를 포함해 실제 페이지 경계를 보존한다.
    return '\n\f\n'.join(page.text for page in result.pages)


def save_result(result: DocumentResult, settings: OcrSettings) -> OcrResponse:
    processing_id = uuid4().hex
    stem = Path(result.filename).stem
    text = document_text(result)
    try:
        settings.outputs_dir.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.ocr-', dir=settings.outputs_dir) as temporary:
            folder = Path(temporary)
            (folder / f'{stem}.txt').write_text(text, encoding='utf-8')
            (folder / f'{stem}.json').write_text(
                json.dumps(result.model_dump(mode='json'), ensure_ascii=False, indent=2, allow_nan=False),
                encoding='utf-8')
            folder.rename(settings.outputs_dir / processing_id)
    except OSError as exc:
        raise OcrError('save_failed', 'OCR 결과를 저장하지 못했습니다. 출력 폴더 권한과 공간을 확인해 주세요.', 500) from exc
    return OcrResponse(processing_id=processing_id, text=text, result=result,
        files={'txt': f'{processing_id}/{stem}.txt', 'json': f'{processing_id}/{stem}.json'})
