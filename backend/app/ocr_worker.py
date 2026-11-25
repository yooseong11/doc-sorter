"""문서별 격리 프로세스. 부모가 문서 제한 시간 초과 시 프로세스 그룹을 종료한다."""
import json
from pathlib import Path
import sys

from .config import OcrSettings
from .services.image_service import load_image
from .ocr_errors import OcrError
from .services.ocr_service import recognize
from .services.pdf_service import process_pdf
from .schemas import DocumentResult


def process_content(content: bytes, filename: str, settings: OcrSettings) -> DocumentResult:
    extension = Path(filename).suffix.lower()
    if extension == '.pdf':
        pages = process_pdf(content, settings)
    else:
        pages = [recognize(load_image(content, settings, extension), 1, settings)]
    failures = sum(page.method == 'error' for page in pages)
    return DocumentResult(filename=filename, language=settings.language, psm=settings.psm,
        confidence_threshold=settings.confidence_threshold, pages=pages,
        status='failed' if failures == len(pages) else 'partial' if failures else 'completed')


def main():
    source, target, settings_file, filename = sys.argv[1:]
    values = json.loads(Path(settings_file).read_text(encoding='utf-8'))
    values['outputs_dir'] = Path(values['outputs_dir'])
    try:
        result = process_content(Path(source).read_bytes(), filename, OcrSettings(**values))
        output = {'result': result.model_dump(mode='json')}
    except OcrError as exc:
        output = {'error': {'code': exc.code, 'message': exc.message, 'status': exc.status}}
    except Exception:
        output = {'error': {'code': 'processing_failed', 'message': '문서를 처리하지 못했습니다.', 'status': 422}}
    Path(target).write_text(json.dumps(output, ensure_ascii=False, allow_nan=False), encoding='utf-8')


if __name__ == '__main__':
    main()
