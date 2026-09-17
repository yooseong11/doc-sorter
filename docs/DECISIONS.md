# 문서 분류기 — 결정 사항

## 1. 사용자
- 주 사용자: 소규모 회사 경영지원 담당자
- 구조: 엔진 공통 + 카테고리 프리셋

## 2. 흐름
받는다 → 나눈다 → 확인 → 폴더 저장 → 기록

## 3. 기능
- 기본 카테고리: 비용 증빙, 근태, 복지 신청, 계약서, 미분류(사람 확인)
- 사용자 카테고리 추가: 이름 + 설명 한 줄
- 웹 + File System Access API. 최상위 폴더 1번 선택 후 IndexedDB에 핸들 기억
- 카테고리 이름 = 하위 폴더. 기존 비슷한 폴더는 처음에 매핑(폴더명 + 파일명 3개 표시)
- 확인 화면: 파일명·카테고리·근거 한 줄, ⚠️만 펼침, 클릭 시 미리보기
- 파일명: 원래 이름 유지, 충돌 시 `_2`
- 기록: `분류기록표_YYMMDD.csv` (UTF-8 BOM, 이어 쓰기)
- 읽기: 텍스트 PDF·DOCX·HWPX → 분류 / HWP·DOC·이미지 → 미분류
- 개인정보: 앞부분 텍스트만 서버로 전송, 파일 자체는 브라우저에만

## 4. 스택
React + JS, Vite, Vercel Functions, OpenAI Structured Outputs, Valibot,
pdfjs-dist(지연 로드), mammoth, jszip, idb-keyval, node --test

## 5. 보류
기록표 쌓임, 동시 저장, AI 파일명, 관리자 경로 설정, 연도 폴더, exe,
OCR(tesseract.js 후보), HWP 추출
