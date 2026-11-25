# 0009. 기술 스택

## 결정
React + JS, Vite, Valibot, mammoth, jszip, idb-keyval, node --test를 사용한다. 백엔드는 별도 backend/의 Python + FastAPI로 전환하며, 분류는 OpenAI Responses API 또는 Ollama로 카테고리와 원문 근거 인용문을 반환하고(0026) OCR은 pytesseract·Pillow·PyMuPDF·OpenCV headless·numpy로 처리한다.

## 이유
PDF·이미지는 로컬 OCR로 처리하고 DOCX·HWPX는 브라우저에서 추출한다(0007·0008). Valibot으로 외부 응답을 검증하며 브라우저는 `/api/classify`·`/api/ocr`를 호출하고 Python 서버는 backend/로 분리한다(0016).

## 버린 대안
- TypeScript, jsconfig + checkJs 전체 검사: 설정·빌드가 번거롭고 경고가 많다.
- 바닐라 JS: 확인 목록의 상태가 복잡해져 React로 화면과 상태를 관리한다.
- Zod 기본(gzip 약 93KB)·Zod Mini(약 5KB): Valibot이 약 1.3KB로 가볍다.
- pdf-parse: 이번 PDF 처리는 로컬 Python에서 PyMuPDF로 페이지별 직접 추출·렌더링을 수행한다.
- DOCX XML 직접 해석: Mammoth의 extractRawText()로 구현 부담을 줄인다.
- fflate: 더 작지만, JSZip 3.10.2 전체 브라우저 배포 파일은 gzip 약 28.5KB로 이 프로젝트에서 수용 가능하다. 용량 절감보다 API 편의성을 우선한다. 실제 앱 번들 증가량은 별도다.
