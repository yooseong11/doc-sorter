"""입력 검증 → 격리된 문서 처리 → 결과 저장. HTTP와 무관한 서비스."""
from dataclasses import asdict
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile

from ..config import OcrSettings
from .export_service import save_result
from ..ocr_errors import OcrError
from ..schemas import DocumentResult, OcrResponse

SUPPORTED = {'.png', '.jpg', '.jpeg', '.pdf'}


def safe_filename(filename: str) -> str:
    name = filename.replace('\\', '/').rsplit('/', 1)[-1]
    name = re.sub(r'[\x00-\x1f\x7f<>:"|?*]', '_', name).strip(' .')
    if not name or len(name.encode('utf-8')) > 240:
        raise OcrError('invalid_filename', '파일명이 비어 있거나 너무 깁니다.', 400)
    if Path(name).suffix.lower() not in SUPPORTED:
        raise OcrError('unsupported_format', 'PNG, JPG, JPEG, PDF만 지원합니다.', 415)
    return name


def process_document(content: bytes, filename: str, settings: OcrSettings | None = None) -> OcrResponse:
    settings = settings or OcrSettings()
    name = safe_filename(filename)
    if not content:
        raise OcrError('empty_file', '빈 파일은 처리할 수 없습니다.', 400)
    if len(content) > settings.max_file_bytes:
        raise OcrError('file_too_large', '파일 크기 제한을 초과했습니다.', 413)
    with tempfile.TemporaryDirectory(prefix='doc-sorter-ocr-') as temporary:
        folder = Path(temporary)
        source, target, configuration = folder / 'source', folder / 'result.json', folder / 'settings.json'
        source.write_bytes(content)
        configuration.write_text(json.dumps(asdict(settings), default=str), encoding='utf-8')
        # stdout/stderr에 원문을 남기지 않는다. 각 프로세스는 PDF·OpenCV 상태를 공유하지 않는다.
        process = subprocess.Popen([sys.executable, '-m', 'app.ocr_worker', str(source), str(target),
                                    str(configuration), name], cwd=Path(__file__).resolve().parents[2],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   start_new_session=True)
        try:
            process.wait(timeout=settings.document_timeout)
        except subprocess.TimeoutExpired as exc:
            if os.name == 'posix':
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            else:
                process.kill()
            process.wait()
            raise OcrError('document_timeout', '문서 처리 시간이 초과되었습니다.', 504) from exc
        if process.returncode != 0 or not target.exists():
            raise OcrError('worker_failed', 'OCR 처리 프로세스가 종료되었습니다.', 500)
        payload = json.loads(target.read_text(encoding='utf-8'))
        if 'error' in payload:
            error = payload['error']
            raise OcrError(error['code'], error['message'], error['status'])
        result = DocumentResult.model_validate(payload['result'])
    return save_result(result, settings)
