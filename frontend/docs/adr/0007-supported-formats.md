# 0007. 문서 텍스트 추출과 로컬 OCR 지원 형식

## 결정
PDF·PNG·JPG·JPEG는 로컬 Python 백엔드에서 처리한다. PDF는 페이지별로 정상 텍스트를 직접 추출하고, 없거나 불완전하면 Tesseract OCR을 수행한다. DOCX(mammoth)·HWPX(JSZip)는 브라우저에서 추출하고 HWP·DOC는 미분류로 보낸다.

## 이유
디지털 PDF의 재인식을 피하면서 스캔·혼합 PDF와 이미지를 지원한다. OCR은 pytesseract의 kor+eng·psm 3을 사용하고 회전·기울기를 보정하며 좌표·Confidence·검토 표시를 보존한다(0008).

## 버린 대안
- 모든 PDF 페이지 OCR: 직접 추출 가능한 텍스트까지 재인식하여 시간과 인식 오류가 늘어난다.
- tesseract.js: 이번 OCR은 로컬 CPU의 Python Tesseract로 확정했다.
- PaddleOCR·OCRmyPDF·Vision LLM: 이번 구현 범위에서 제외한다.
