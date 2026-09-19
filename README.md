# doc-sorter (문서 분류기)

소규모 회사 경영지원 담당자를 위한 문서 자동 분류 웹앱.
받은 문서를 카테고리별로 나누고, 확인 후 폴더에 저장하고, CSV로 기록합니다.

- 스토리 맵: [docs/STORY_MAP.md](docs/STORY_MAP.md)
- 결정 기록(ADR): [docs/adr/](docs/adr/)

## 시작
```bash
npm install
npm run dev
```

## 스크립트
- `npm run dev` 개발 서버
- `npm run build` 빌드
- `npm test` 테스트 (node --test)

## 폴더
- `src/components` 화면
- `src/lib` 분류 엔진·파일 읽기·기록 (브라우저)
- `api` Vercel Functions (OpenAI 호출)
- `docs/STORY_MAP.md` 스토리 맵
- `docs/adr` 결정 기록(ADR)

## 분류 API 설정

`.env.example`을 `.env.local`로 복사하고 서버 설정을 채웁니다.

```dotenv
AI_PROVIDER=openai
AI_MODEL=사용할-모델-ID
AI_API_KEY=발급받은-키
```

키는 `AI_API_KEY` 또는 기존 `OPENAI_API_KEY`에 넣습니다. `VITE_` 접두사를 붙이면 안 됩니다.
환경 변수를 바꾼 뒤 개발 서버를 재시작하세요. `npm run dev`는 로컬 `/api/classify`도 실행합니다.
Vercel에서는 같은 변수를 프로젝트의 서버 환경 변수로 등록합니다.

제공자는 `openai`, `deepseek`, `openai-compatible` 세 가지입니다. 주소와 응답 형식은 `server/classifier.js`의 `PROVIDERS` 표에 모여 있습니다.

| 제공자 | 주소 | 응답 형식 | 비고 |
|---|---|---|---|
| `openai` | `https://api.openai.com/v1` | `json_schema` strict | 모델이 Structured Outputs를 지원해야 합니다 |
| `deepseek` | `https://api.deepseek.com/v1` | `json_object` | 추론 모드를 코드에서 끕니다 |
| `openai-compatible` | `AI_BASE_URL` | `json_schema` strict | Chat Completions와 strict JSON Schema를 모두 지원해야 합니다 |

DeepSeek은 다음 세 줄이면 됩니다. 주소는 기본값이라 `AI_BASE_URL`을 채우지 않아도 됩니다.

```dotenv
AI_PROVIDER=deepseek
AI_MODEL=deepseek-flash
AI_API_KEY=sk-발급받은-키
```

DeepSeek은 strict `json_schema`를 `"This response_format type is unavailable now"`로 거부하므로 `json_object`로 요청하고, 형식은 프롬프트의 예시로 유도합니다. 스키마를 강제하지 못하는 만큼 서버의 `normalizeClassification`이 카테고리 밖 값과 깨진 JSON을 미분류로 떨어뜨립니다. 또 추론 모드가 기본 켜짐이라 분류 한 건에 추론 토큰만 수백 개가 나가므로 `thinking: { type: 'disabled' }`로 끕니다. 이 설정을 빼면 비용이 몇 배로 오르고 `max_tokens`에 걸려 응답이 잘릴 수 있습니다.

규격이 또 다른 API는 `server/classifier.js`의 `PROVIDERS`에 한 줄 추가합니다. 환경 변수만으로 서로 다른 프로토콜까지 변환하지는 않습니다.

- 브라우저는 원본을 보관하고 파일명과 앞부분 최대 6,000자만 전송합니다.
- R1 추출 대상은 PDF·DOCX입니다. HWPX 추출은 R2이며, 현재 미지원 형식은 미분류로 유지합니다.
- 공백을 제외한 추출 텍스트가 10자 미만이면 API를 호출하지 않습니다.
- 분류는 파일별로 순차 처리하며 자동 재시도는 하지 않습니다. 실패한 파일만 확인 화면에서 재시도합니다.
- R1 응답은 카테고리만 받습니다. 근거 인용문은 R2입니다.
- S1→S2→S3까지 실제 파일 목록을 공유합니다. 저장은 최상위 폴더를 한 번 고르면 핸들을 idb-keyval에 기억해 다음에 그대로 씁니다.

## 저장 규칙

- 카테고리 이름이 그대로 하위 폴더가 되고, `미분류`도 예외 없이 폴더를 만들어 넣습니다(ADR 0003 · 0014).
- 같은 이름의 파일이 있으면 덮어쓰지 않고 `_2`, `_3` … 을 붙입니다. 이름은 저장 직전에 확정합니다(ADR 0005).
- 파일 하나를 쓸 때마다 `분류기록표_YYMMDD.csv`에 한 줄씩 이어 씁니다. 파일을 새로 만들 때만 UTF-8 BOM과 헤더를 붙입니다(ADR 0006).
- 중간에 실패해도 끝까지 돌고 성공분은 되돌리지 않습니다. 재시도는 실패한 파일만 합니다(ADR 0011).
- 기록표 쓰기만 실패한 파일은 재시도할 때 파일을 다시 쓰지 않습니다. 같은 파일이 둘 생기기 때문입니다.

## 로직과 테스트

- `src/lib/state/documentsReducer.js`: 파일 상태 reducer
- `src/lib/read/`: 파일 형식 판별과 브라우저 텍스트 추출
- `src/lib/state/runDocuments.js`: 읽기·분류·실패분 재시도
- `src/lib/classify/classify.js`: 자체 API 호출 어댑터
- `src/lib/save/saveFolder.js`: 최상위 폴더 선택·권한·핸들 기억
- `src/lib/save/savePlan.js`: 저장될 이름·경로 결정과 `_2` 충돌 처리
- `src/lib/save/saveFiles.js`: 카테고리 폴더에 쓰기와 실패 격리
- `src/lib/save/logCsv.js`: 분류기록표 이어 쓰기
- `server/classifier.js`: 서버 전용 제공자 설정과 호출 어댑터
- `api/classify.js`: 입력 검증과 HTTP 응답

`npm test`는 외부 API를 호출하지 않고 의존성을 주입해 부분 실패, 재시도, 삭제 후 늦은 응답, 전송 범위와 환경 변수 전환을 검증합니다. 저장 로직은 메모리 폴더 핸들을 주입해 `_2` 충돌, 부분 실패, 기록표 이어 쓰기까지 검증합니다.
