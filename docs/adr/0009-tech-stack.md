# 0009. 기술 스택

## 결정
React + JS, Vite, Vercel Functions, OpenAI Structured Outputs, Valibot, pdfjs-dist(지연 로드), mammoth, jszip, idb-keyval, node --test.

## 이유
회의록 추출기 스택을 그대로 가져와 코드를 재사용한다. 타입은 전체에 걸지 않고, 실수가 생기는 외부 데이터 경계에서만 Valibot으로 실행 중에 검사해 실패하면 미분류로 보낸다.

## 버린 대안
- TypeScript, jsconfig + checkJs 전체 검사: 설정·빌드가 번거롭고 경고가 많다.
- 바닐라 JS: 확인 목록의 상태가 금방 복잡해지고 코드를 재사용할 수 없다.
- Zod 기본(gzip 약 93KB)·Zod Mini(약 5KB): Valibot이 약 1.3KB로 가볍다.
