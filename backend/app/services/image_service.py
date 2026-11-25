"""원본을 건드리지 않고 전처리하며 원본 pixel → 처리 pixel 변환을 누적한다."""
import io
import math
import warnings

import cv2
import numpy as np
import pytesseract
from PIL import Image, UnidentifiedImageError

from ..config import OcrSettings
from ..ocr_errors import OcrError


def load_image(content: bytes, settings: OcrSettings, extension: str) -> Image.Image:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as source:
                expected = 'PNG' if extension == '.png' else 'JPEG'
                if source.format != expected:
                    raise OcrError('format_mismatch', '확장자와 이미지 형식이 일치하지 않습니다.')
                if source.width * source.height > settings.max_image_pixels:
                    raise OcrError('image_too_large', '이미지 픽셀 제한을 초과했습니다.', 413)
                # 투명 배경은 검게 변환되지 않도록 흰색 위에 합성한다.
                rgba = source.convert('RGBA')
                background = Image.new('RGBA', source.size, 'white')
                return Image.alpha_composite(background, rgba).convert('RGB')
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise OcrError('invalid_image', '이미지가 손상되었거나 안전하게 읽을 수 없습니다.') from exc


def rotate_expanded(image: Image.Image, angle: float, max_pixels: int | None = None):
    """양수는 반시계 방향. pixel 경계 좌표 기준 3×3 동차 행렬을 반환한다."""
    if not angle:
        return image, np.eye(3)
    width, height = image.size
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
    cosine, sine = abs(matrix[0, 0]), abs(matrix[0, 1])
    new_width = int(math.ceil(round(height * sine + width * cosine, 8)))
    new_height = int(math.ceil(round(height * cosine + width * sine, 8)))
    if max_pixels is not None and new_width * new_height > max_pixels:
        raise OcrError('image_too_large', '전처리 이미지의 픽셀 제한을 초과했습니다.', 413)
    matrix[0, 2] += (new_width - width) / 2
    matrix[1, 2] += (new_height - height) / 2
    # OpenCV는 pixel 중심을 정수로 취급한다. 경계 기준 행렬을 sampling 좌표로 변환한다.
    sampling = matrix.copy()
    sampling[:, 2] += matrix[:, :2] @ np.array([0.5, 0.5]) - 0.5
    pixels = cv2.warpAffine(np.asarray(image), sampling, (new_width, new_height),
                            flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT,
                            borderValue=(255, 255, 255))
    return Image.fromarray(pixels), np.vstack([matrix, [0, 0, 1]])


def estimate_skew(image: Image.Image, maximum: float) -> float:
    """긴 수평 문자 획/행의 중앙 각도만 보정한다. 근거 부족 시 0도."""
    gray = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2GRAY)
    scale = min(1.0, 1600 / max(image.size))
    if scale < 1:
        gray = cv2.resize(gray, None, fx=scale, fy=scale)
    binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    edges = cv2.Canny(binary, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 1800, threshold=40,
                            minLineLength=max(30, gray.shape[1] // 12), maxLineGap=20)
    if lines is None:
        return 0.0
    angles = []
    for x1, y1, x2, y2 in lines[:, 0]:
        angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
        angle = (angle + 90) % 180 - 90
        if abs(angle) <= maximum:
            angles.append(angle)
    if len(angles) < 3:
        return 0.0
    median = float(np.median(angles))
    if np.median(np.abs(np.array(angles) - median)) > 1.5:
        return 0.0
    return median if abs(median) >= 0.15 else 0.0


def preprocess(image: Image.Image, settings: OcrSettings, timeout: float):
    notes = []
    rotation = 0
    orientation_confidence = None
    try:
        osd = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT,
                                      timeout=min(timeout, 15))
        orientation_confidence = float(osd.get('orientation_conf', 0))
        candidate = int(osd.get('rotate', 0))
        if orientation_confidence >= settings.osd_min_confidence and candidate in (0, 90, 180, 270):
            rotation = candidate
        else:
            notes.append('orientation_uncertain: 방향 신뢰도가 낮아 자동 회전하지 않았습니다.')
    except (pytesseract.TesseractError, RuntimeError):
        notes.append('orientation_unavailable: 방향 탐지 실패로 기존 방향을 유지했습니다.')
    processed, transform = rotate_expanded(image, -rotation, settings.max_image_pixels)
    deskew = estimate_skew(processed, settings.max_deskew_degrees)
    processed, skew_transform = rotate_expanded(processed, deskew, settings.max_image_pixels)
    transform = skew_transform @ transform
    geometry = {
        'original_image_size': {'width': image.width, 'height': image.height},
        'processed_image_size': {'width': processed.width, 'height': processed.height},
        'rotation_clockwise_degrees': rotation,
        'deskew_counterclockwise_degrees': deskew,
        'orientation_confidence': orientation_confidence,
        'original_to_processed': transform.tolist(),
        'processed_to_original': np.linalg.inv(transform).tolist(),
        'coordinate_convention': 'top-left origin; x right, y down; pixel edges',
    }
    return processed, geometry, notes
