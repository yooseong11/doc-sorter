# 0009. 기술 스택

## 결정
React + JS, Vite, Vercel Functions, OpenAI Structured Outputs, Valibot, pdfjs-dist(지연 로드), mammoth, jszip, idb-keyval, node --test.

## 이유
브라우저에서 원본을 처리한다(0008). PDF.js는 사용자 기반·유지보수와 페이지 제어, Mammoth는 순수 텍스트 추출 API, JSZip은 내부 파일 접근의 편의성과 수용 가능한 크기로 선택한다. Valibot은 외부 데이터 경계만 실행 중 검사해 실패하면 미분류로 보낸다.

## 버린 대안
- TypeScript, jsconfig + checkJs 전체 검사: 설정·빌드가 번거롭고 경고가 많다.
- 바닐라 JS: 확인 목록의 상태가 복잡해져 React로 화면과 상태를 관리한다.
- Zod 기본(gzip 약 93KB)·Zod Mini(약 5KB): Valibot이 약 1.3KB로 가볍다.
- pdf-parse: PDF.js 기반의 추출 편의 API지만, 필요한 페이지를 직접 제어하는 PDF.js를 사용한다. 추출 정확도·속도 우위를 주장하는 선택은 아니다.
- DOCX XML 직접 해석: Mammoth의 extractRawText()로 구현 부담을 줄인다.
- fflate: 더 작지만, JSZip 3.10.2 전체 브라우저 배포 파일은 gzip 약 28.5KB로 이 프로젝트에서 수용 가능하다. 용량 절감보다 API 편의성을 우선한다. 실제 앱 번들 증가량은 별도다.
