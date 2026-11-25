"""표준 unittest 기반 서비스/API 회귀 및 실제 Tesseract 통합 검증."""
from dataclasses import replace
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pymupdf
import pytesseract
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient

from app.config import OcrSettings
from app.services.image_service import preprocess, rotate_expanded, estimate_skew
from app.main import app
from app.ocr_errors import OcrError
from app.services.ocr_service import words_from_data, reconstruct_text, check_engine, recognize
from app.ocr_worker import process_content
from app.services.pdf_service import process_pdf
from app.services.document_service import process_document


def png(image):
    stream = io.BytesIO()
    image.save(stream, format='PNG')
    return stream.getvalue()


def sample(text=None, korean=False):
    image = Image.new('RGB', (1600, 1100) if korean else (1800, 1600), 'white')
    font_path = os.getenv('OCR_TEST_FONT', '/System/Library/Fonts/Supplemental/AppleGothic.ttf' if korean else '/System/Library/Fonts/Supplemental/Arial.ttf')
    if not Path(font_path).exists():
        raise unittest.SkipTest('OCR_TEST_FONT에 한글·영어 지원 폰트 경로를 지정하세요.')
    font = ImageFont.truetype(font_path, 48 if korean else 36)
    draw = ImageDraw.Draw(image)
    lines = [
        'Document processing extracts useful words from a scanned page.',
        'The local computer keeps the original file and saves every result.',
        'Each paragraph has a different sentence with ordinary English words.',
        'Review uncertain characters before using them to classify invoices.',
        'The reading order should follow the printed lines on this document.',
        'An education notice includes a title and application instructions.',
        'Please check the page number and the position of each bounding box.',
        'This example contains enough text to detect the correct orientation.',
    ]
    if korean:
        lines = [text, '접수 기간은 오늘부터 다음 주 금요일까지입니다.',
                 '신청서를 작성한 뒤 담당자에게 제출해 주세요.',
                 '문서 분류 결과와 페이지 번호를 확인합니다.',
                 '참가 신청 안내 및 교육 일정 확인']
        for index, line in enumerate(lines):
            draw.text((60, 70 + index * 110), line, fill='black', font=font)
        return image
    for index in range(20):
        draw.text((60, 50 + index * 72), text or lines[index % len(lines)], fill='black', font=font)
    return image


def make_pdf(images=False):
    document = pymupdf.open()
    page = document.new_page(width=400, height=300)
    page.insert_text((30, 40), 'Digital document invoice number 12345', fontsize=14)
    if images:
        page = document.new_page(width=400, height=300)
        page.insert_image(page.rect, stream=png(sample()))
    content = document.tobytes()
    document.close()
    return content


class OcrTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.settings = OcrSettings(outputs_dir=Path(self.folder.name), dpi=150)

    def tearDown(self):
        self.folder.cleanup()

    def test_word_filter_threshold_and_lines(self):
        data = {'text': ['Heading', '', 'invalid', 'low', 'Next', 'paragraph', 'nan'],
                'conf': [70, 95, -1, 69.9, 90, 80, float('nan')], 'level': [5, 5, 5, 5, 5, 4, 5],
                'left': [0]*7, 'top': [0]*7, 'width': [10]*7, 'height': [5]*7,
                'page_num': [1]*7, 'block_num': [1]*7, 'par_num': [1]*7,
                'line_num': [1, 1, 1, 1, 2, 3, 3]}
        words = words_from_data(data, self.settings)
        self.assertEqual([word.text for word in words], ['Heading', 'low', 'Next'])
        self.assertEqual([word.needs_review for word in words], [False, True, False])
        self.assertEqual(reconstruct_text(words), 'Heading low\nNext')

    def test_osd_uncertain_and_failure_preserve_rotation(self):
        image = Image.new('RGB', (300, 200), 'white')
        with patch('app.services.image_service.pytesseract.image_to_osd', return_value={'rotate': 90, 'orientation_conf': 2}):
            processed, geometry, notes = preprocess(image, self.settings, 2)
            self.assertEqual(processed.size, image.size)
            self.assertEqual(geometry['rotation_clockwise_degrees'], 0)
            self.assertTrue(notes)
        with patch('app.services.image_service.pytesseract.image_to_osd', side_effect=RuntimeError('timeout')):
            self.assertTrue(preprocess(image, self.settings, 2)[2])

    def test_confident_rotation_transform(self):
        image = Image.new('RGB', (300, 200), 'white')
        with patch('app.services.image_service.pytesseract.image_to_osd', return_value={'rotate': 90, 'orientation_conf': 20}):
            processed, geometry, _ = preprocess(image, self.settings, 2)
        self.assertEqual(processed.size, (200, 300))
        forward, inverse = np.array(geometry['original_to_processed']), np.array(geometry['processed_to_original'])
        np.testing.assert_allclose(inverse @ forward, np.eye(3), atol=1e-10)
        np.testing.assert_allclose(forward @ [0, 0, 1], [200, 0, 1], atol=1e-10)

    def test_deskew_real_lines(self):
        image = Image.new('RGB', (1200, 800), 'white')
        draw = ImageDraw.Draw(image)
        for y in range(100, 700, 50):
            draw.line((100, y, 1100, y), fill='black', width=3)
        skewed, _ = rotate_expanded(image, -3)
        angle = estimate_skew(skewed, 10)
        self.assertAlmostEqual(angle, 3, delta=0.5)
        corrected, _ = rotate_expanded(skewed, angle)
        self.assertAlmostEqual(estimate_skew(corrected, 10), 0, delta=0.5)

    def test_direct_pdf_no_engine_needed(self):
        with patch('app.services.pdf_service.recognize', side_effect=AssertionError('OCR must not run')):
            pages = process_pdf(make_pdf(), self.settings)
        self.assertEqual(pages[0].method, 'direct')
        self.assertIn('Digital document', pages[0].text)
        self.assertEqual(pages[0].coordinate_space, 'pdf_page_pt')
        self.assertIsNone(pages[0].words[0].confidence)

    def test_mixed_pdf_partial_failure_and_actual_page(self):
        with patch('app.services.pdf_service.recognize', side_effect=OcrError('ocr_timeout', 'timeout', 504)):
            result = process_content(make_pdf(True), 'mixed.pdf', self.settings)
        self.assertEqual(result.status, 'partial')
        self.assertEqual([(page.page, page.method) for page in result.pages], [(1, 'direct'), (2, 'error')])

    def test_header_plus_scan_uses_ocr(self):
        document = pymupdf.open()
        page = document.new_page(width=400, height=600)
        page.insert_text((20, 30), 'Digital title only not the body')
        page.insert_image(pymupdf.Rect(0, 100, 400, 600), stream=png(sample()))
        content = document.tobytes()
        document.close()
        with patch('app.services.pdf_service.recognize', side_effect=OcrError('test', 'selected OCR')) as recognize:
            process_pdf(content, self.settings)
        recognize.assert_called_once()

    def test_engine_missing_and_language_missing(self):
        with patch('app.services.ocr_service.pytesseract.get_tesseract_version', side_effect=pytesseract.TesseractNotFoundError()):
            with self.assertRaises(OcrError) as error:
                check_engine(self.settings)
            self.assertEqual(error.exception.status, 503)
        with patch('app.services.ocr_service.pytesseract.get_languages', return_value=['eng', 'osd']):
            with self.assertRaises(OcrError) as error:
                check_engine(self.settings)
            self.assertEqual(error.exception.code, 'language_missing')

    def test_page_timeout_and_engine_error_are_distinct(self):
        image = Image.new('RGB', (100, 100), 'white')
        for exception, expected in [(RuntimeError('timeout'), 'ocr_timeout'),
                                    (pytesseract.TesseractError(1, 'failed'), 'ocr_failed')]:
            with patch('app.services.ocr_service.check_engine'), \
                 patch('app.services.ocr_service.preprocess', return_value=(image, {}, [])), \
                 patch('app.services.ocr_service.pytesseract.image_to_data', side_effect=exception):
                with self.assertRaises(OcrError) as error:
                    recognize(image, 4, self.settings)
                self.assertEqual(error.exception.code, expected)

    def test_image_content_mismatch_and_pixel_limit(self):
        content = png(Image.new('RGB', (100, 100), 'white'))
        for settings, filename, code in [(self.settings, 'wrong.jpg', 'format_mismatch'),
                (replace(self.settings, max_image_pixels=100), 'large.png', 'image_too_large')]:
            with self.assertRaises(OcrError) as error:
                process_document(content, filename, settings)
            self.assertEqual(error.exception.code, code)

    def test_invalid_inputs_and_limits(self):
        cases = [(b'', 'empty.png', 'empty_file'), (b'abc', 'bad.bmp', 'unsupported_format'),
                 (b'bad', 'bad.png', 'invalid_image'), (b'bad', 'bad.pdf', 'invalid_pdf')]
        for content, name, code in cases:
            with self.subTest(code=code), self.assertRaises(OcrError) as error:
                process_document(content, name, self.settings)
            self.assertEqual(error.exception.code, code)
        with self.assertRaises(OcrError):
            process_document(b'1234', 'large.pdf', replace(self.settings, max_file_bytes=3))
        with self.assertRaises(OcrError):
            process_pdf(make_pdf(True), replace(self.settings, max_pages=1))
        document = pymupdf.open(stream=make_pdf(), filetype='pdf')
        encrypted = document.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw='owner', user_pw='secret')
        document.close()
        with self.assertRaises(OcrError) as error:
            process_pdf(encrypted, self.settings)
        self.assertEqual(error.exception.code, 'encrypted_pdf')

    def test_document_timeout_and_output_cleanup(self):
        with self.assertRaises(OcrError) as error:
            process_document(make_pdf(), 'timeout.pdf', replace(self.settings, document_timeout=0.001))
        self.assertEqual(error.exception.code, 'document_timeout')
        self.assertEqual(list(self.settings.outputs_dir.iterdir()), [])

    def test_api_save_utf8_safe_paths_repeated(self):
        with patch('app.main.OcrSettings', return_value=self.settings), TestClient(app) as client:
            response = client.post('/api/ocr', files={'file': ('../../문서.pdf', make_pdf(), 'application/pdf')})
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()
            self.assertEqual(data['result']['filename'], '문서.pdf')
            saved = json.loads((self.settings.outputs_dir / data['files']['json']).read_text(encoding='utf-8'))
            self.assertEqual(saved, data['result'])
            self.assertEqual((self.settings.outputs_dir / data['files']['txt']).read_text(encoding='utf-8'), data['text'])
            again = client.post('/api/ocr', files={'file': ('문서.pdf', make_pdf())}).json()
            self.assertNotEqual(data['processing_id'], again['processing_id'])
            self.assertEqual(client.post('/api/ocr', files={'file': ('bad.png', b'bad')}).status_code, 422)
            self.assertEqual(client.post('/api/ocr', files={'file': ('bad.txt', b'bad')}).status_code, 415)
            self.assertEqual(client.post('/api/ocr', files={'file': ('empty.png', b'')}).status_code, 400)


@unittest.skipUnless(os.getenv('RUN_OCR_INTEGRATION') == '1', 'RUN_OCR_INTEGRATION=1로 실제 엔진 검증')
class RealOcrTests(unittest.TestCase):
    setUp = OcrTests.setUp
    tearDown = OcrTests.tearDown

    def test_real_korean_english_mixed_images(self):
        cases = [('교육과정 안내 신청서 문서 분류 테스트', True, '문서분류'),
                 ('Document processing English invoice number 12345', False, 'Document'),
                 ('교육과정 안내 Document invoice 12345', True, 'Document')]
        for text, korean, expected in cases:
            with self.subTest(text=text):
                result = process_document(png(sample(text, korean)), 'sample.png', self.settings)
                page = result.result.pages[0]
                self.assertIn(expected, ''.join(page.text.split()))
                self.assertTrue(page.words)
                self.assertEqual(page.coordinate_space, 'processed_image_px')

    def test_real_jpeg_and_review_threshold(self):
        stream = io.BytesIO()
        sample().save(stream, format='JPEG')
        for filename in ('photo.jpg', 'photo.jpeg'):
            result = process_document(stream.getvalue(), filename,
                                      replace(self.settings, confidence_threshold=100))
            self.assertIn('Document', result.text)
            self.assertTrue(result.result.pages[0].words)
            self.assertTrue(all(word.needs_review for word in result.result.pages[0].words))

    def test_real_rotated_images(self):
        # OSD 신뢰도 15 미만인 문서는 정책상 회전하지 않는다. 충분한 문자량의 샘플로 검증한다.
        for angle in (90, 180):
            with self.subTest(angle=angle):
                result = process_document(png(sample().rotate(angle, expand=True)), 'rotated.png', self.settings)
                page = result.result.pages[0]
                self.assertIn('Document', page.text)
                self.assertEqual(page.geometry['rotation_clockwise_degrees'], angle)

    def test_real_deskew_and_blank(self):
        image, _ = rotate_expanded(sample(), -3)
        result = process_document(png(image), 'skew.png', self.settings)
        self.assertIn('Document', result.text)
        self.assertAlmostEqual(result.result.pages[0].geometry['deskew_counterclockwise_degrees'], 3, delta=1)
        blank = process_document(png(Image.new('RGB', (800, 800), 'white')), 'blank.png', self.settings)
        self.assertEqual(blank.text, '')
        self.assertTrue(blank.result.pages[0].warnings)

    def test_real_scan_and_mixed_pdf(self):
        result = process_document(make_pdf(True), 'mixed.pdf', replace(self.settings, dpi=300))
        self.assertEqual(result.result.pages[1].geometry['dpi'], 300)
        self.assertEqual([(p.page, p.method) for p in result.result.pages], [(1, 'direct'), (2, 'ocr')])
        self.assertIn('Document', result.result.pages[1].text)
        self.assertIn('pdf_page_to_original_image', result.result.pages[1].geometry)
        document = pymupdf.open(stream=make_pdf(True), filetype='pdf')
        document.delete_page(0)
        scan = document.tobytes()
        document.close()
        result = process_document(scan, 'scan.pdf', self.settings)
        self.assertEqual(result.result.pages[0].method, 'ocr')
