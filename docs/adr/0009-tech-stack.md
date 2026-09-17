# 0009. 기술 스택

- 상태: 채택
- 날짜: 2026-09-17

## 결정
React + JS, Vite, Vercel Functions, OpenAI Structured Outputs, Valibot,
pdfjs-dist(지연 로드), mammoth, jszip, idb-keyval, node --test

## 이유
- 회의록 추출기 스택을 거의 그대로 가져간다. 이미 익숙하고, 코드를 재사용할 수 있고, 두 프로젝트가 같은 설계 원칙을 쓴다.
- React: 화면은 3개(파일 올리기, 확인 목록, 폴더 설정)로 적지만, 확인 목록은 카테고리 변경·⚠️ 펼치기·미리보기·되돌리기로 상태가 복잡하다.
- JS: 회의록 추출기에서 TS 코드가 복잡했고, tsconfig 3개·tsx·typecheck 같은 설정이 번거로웠다.
- Valibot: 실수는 주로 밖에서 들어오는 데이터(AI 응답, 설정 JSON, 기존 기록표 CSV)에서 생긴다. TS는 내가 쓴 코드의 실수만 잡고 AI가 보낸 이상한 값은 못 잡는다. 그래서 전체에 타입을 거는 대신 경계에서만 실행 중에 검사한다. 검사에 실패하면 미분류로 보낸다.
- Valibot은 gzip 약 1.3KB로 측정됐다(Zod Mini 약 5KB, Zod 기본 약 93KB).
- Vercel Functions: API 키를 숨기고, 배포하면 즉시 반영된다.
- OpenAI Structured Outputs: 카테고리 목록을 동적 enum으로 넣어 코드를 고치지 않고 카테고리를 늘린다.
- pdfjs-dist 지연 로드: 이 앱에서 가장 무거운 건 파일 읽기 라이브러리라서(pdfjs-dist 워커 약 375KB, mammoth 약 126KB) 필요할 때만 불러온다.
- idb-keyval: 폴더 핸들을 IndexedDB에 한 줄로 저장한다.
- node --test: 설정 없이 바로 테스트를 돌린다.

## 버린 대안
- TypeScript: 설정·빌드가 번거롭다. (타입은 빌드 때 지워져 앱 크기에는 영향이 없으므로 크기 문제는 아니다.)
- 바닐라 JS(React 없이): 상태가 바뀔 때마다 DOM을 직접 고쳐야 해서 확인 목록이 금방 복잡해지고, 회의록 추출기 코드를 재사용할 수 없다.
- Zod 기본: gzip 약 93KB로 React(약 69KB)보다 크다.
- Zod Mini: 가능하지만 Valibot이 더 가볍다.
- `jsconfig.json` + `checkJs`(전체 검사): 경고가 많아져 번거롭다. 헷갈리는 파일에만 `// @ts-check`를 붙인다.
