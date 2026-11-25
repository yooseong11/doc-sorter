### 가상환경 실행

```
python3 -m venv .venv
source .venv/bin/activate
```

### 서버 실행
```
python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

## 로컬 OCR 실행

Python 3.12 환경에서 검증했다. 시스템에 Tesseract와 `kor`, `eng`, `osd` 데이터가 필요하다.
macOS(Homebrew)는 `brew install tesseract tesseract-lang`, Ubuntu는
`apt install tesseract-ocr tesseract-ocr-kor tesseract-ocr-eng tesseract-ocr-osd`로 준비할 수 있다.
실제 설치 여부는 `tesseract --version`, `tesseract --list-langs`로 확인한다.

```sh
cd backend
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pip check
python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000
```

프론트는 기존 Vite `/api` 프록시로 연결한다. 개발 중 다른 로컬 포트가 필요하면 프론트 실행 시 `DOC_SORTER_API_TARGET=http://127.0.0.1:8001 npm run dev`처럼 지정할 수 있다. PDF와 이미지 처리는 이 로컬 서버가 필요하다.
외부 서버에 원본을 보내지 않도록 서버를 사용자 PC의 `127.0.0.1`에서 실행한다.
`/api/classify`는 `AI_PROVIDER`로 고른 OpenAI 또는 Ollama로 분류하고 원문 근거 인용문을 반환한다.

### AI 분류 설정

`backend/.env.example`을 참고해 `backend/.env`를 만들고 서버를 재시작한다. provider는 서버 시작 시 한 번 고른다.

- `AI_PROVIDER=openai`(기본값): `OPENAI_API_KEY`, `OPENAI_MODEL`이 필요하다. 모델은 Responses API와 Structured Outputs를 지원해야 한다.
- `AI_PROVIDER=ollama`: `OLLAMA_MODEL`이 필요하고 `OLLAMA_BASE_URL`(기본 `http://127.0.0.1:11434`)은 선택이다. 본문이 PC 밖으로 나가지 않는다. Ollama의 `format` JSON Schema 출력을 지원하는 버전을 쓴다.

API 키는 프론트에 넣지 않는다. `pip install -r requirements.txt`로 OpenAI SDK도 설치한다.
설정이 빠져도 서버는 떠서 OCR은 쓸 수 있고, 분류 요청만 503으로 안내한다. `GET /health`로 고른 provider와 모델을 확인할 수 있다.

요청 JSON은 `{name, text, categories: [{name, hint}]}`이며 text는 최대 3000자다.
응답은 `{category, quote}`로, quote는 요약이 아닌 120자 이내의 원문 인용이다.
목록 밖 카테고리는 미분류로 보정하고 원문에 없는 인용문은 비운다.
AI 요청은 35초 제한·자동 재시도 없음이며 설정 누락 503, AI 오류 502, 시간 초과 504를 반환한다.
실패한 문서는 기존 화면에서 재시도할 수 있다.
OpenAI 호출은 [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)의 JSON Schema 출력을 사용한다.

```sh
curl -F 'file=@/absolute/path/document.pdf' http://127.0.0.1:8000/api/ocr
```

`POST /api/ocr`는 multipart `file` 하나를 받는다. PNG/JPG/JPEG/PDF를 지원하며
응답에 `processing_id`, 전체 `text`, `result`, `files`(outputs 기준 상대 경로)를 담는다.
성공 HTTP 200 안에서도 `result.status`는 `completed`/`partial`/`failed`로 구분한다.
일부/전체 페이지 오류는 `method: error`, 오류 코드와 안내를 기록하고, 처리 가능한 페이지는 유지한다.
엔진/언어 데이터 누락처럼 요청 전체에 영향을 주는 오류는 HTTP 503이다.
빈 파일 400, 용량·페이지 제한 413, 형식 415, 손상·암호화 422, 전체 시간 초과 504,
저장·worker 실패 500이며 오류는 `detail: {code, message}` 형식이다.

### 처리 흐름과 핵심 함수

서비스는 `app/services/`에 모으고, `main.py`는 API 요청·응답을 담당한다.
`ocr_worker.py`는 격리 프로세스 진입점으로 `app/`에 유지한다.

```text
app/
├── main.py
├── config.py
├── schemas.py
├── ocr_errors.py
├── ocr_worker.py
├── providers/
└── services/
    ├── __init__.py
    ├── document_service.py
    ├── ocr_service.py
    ├── image_service.py
    ├── pdf_service.py
    └── export_service.py
```

- `services.document_service.process_document`: 입력 검증 → 문서별 격리 worker → 저장. 전체 시간 초과 시 worker와 Tesseract 프로세스 그룹을 종료한다(POSIX).
- `services.image_service.preprocess`: OSD 신뢰도가 충분할 때 90/180/270도 회전 → OpenCV 행 각도 중앙값으로 Deskew. 실패/근거 부족은 방향을 유지하고 경고를 남긴다.
- `services.ocr_service.recognize`: `image_to_data(lang="kor+eng", config="--psm 3", Output.DICT)`로 단어를 인식한다. 빈 문자열·음수 Confidence·단어 이외 계층을 제외하고, 블록·문단·행 경계를 복원한다.
- `services.pdf_service.process_pdf`: 직접 추출 문자 수·문자 품질 및 큰 이미지 영역의 텍스트 중첩을 검사한다. 기준 미달 페이지에만 OCR한다. 제목+스캔 본문도 OCR 대상으로 판단한다.
- `services.export_service.save_result`: UUID별 임시 폴더에서 두 파일을 완성한 후 공개한다. 원본은 변경하지 않고 처리 임시 파일은 정리한다.

직접 추출 여부 판정은 휴리스틱이며, 깨끗해 보이는 잘못된 기존 OCR 텍스트나 복잡한 레이아웃을 완벽하게 판별하지 못한다.
읽기 순서는 엔진/PyMuPDF 순서와 블록·행 정보를 활용하며 표·다단 문서의 의미적 읽기 순서를 보장하지 않는다.
Confidence는 정확도 확률이 아닌 검토 대상 선정 지표다. 기준 미만 단어도 삭제하지 않는다.

### 결과와 좌표

기본 결과 위치: `backend/outputs/<UUID>/<안전한 원본 stem>.txt`, `.json`.
같은 이름을 재처리해도 다른 UUID를 사용한다. Git에서는 결과 폴더를 제외한다.
TXT는 UTF-8이고 페이지 사이에 form-feed(`\f`)를 넣는다. 빈/실패 페이지도 경계를 유지한다.
JSON은 전체 페이지와 단어를 보존한다. 직접 추출 단어의 Confidence는 null, paragraph는 0(미제공)이다.

- 직접 추출: `pdf_page_pt`, 회전 전 CropBox 기준 좌상단 원점, 1 point = 1/72 inch.
- OCR: `processed_image_px`, 전처리 이미지의 좌상단 원점, pixel 경계 좌표.
- `geometry.original_to_processed`, `processed_to_original`: 3×3 동차 행렬. `[x,y,1]` 열벡터에 곱한다.
- OCR 박스를 원본 이미지에 그리려면 네 모서리를 역변환한다. Deskew 후에는 사각형이 사변형이 될 수 있다.
- PDF OCR은 DPI, CropBox, PDF 회전과 `pdf_page_to_original_image`도 보존한다.
  PDF 좌표→처리 이미지 좌표는 `original_to_processed @ pdf_page_to_original_image`로 계산한다.
- JPEG EXIF 자동 회전은 적용하지 않는다. 원본 크기/변환은 파일의 실제 pixel 배열 기준이며 방향은 OSD가 판단한다.

### config.py OCR 설정

`app/config.py`의 `OcrSettings` 기본값을 직접 수정한 뒤 백엔드를 재시작한다.
OCR 설정은 `.env`나 환경변수로 덮어쓰지 않는다. AI 제공자의 모델·API 키 등은 기존처럼 `.env`에서 읽는다.

| OcrSettings 필드 | 기본값 | 의미 |
|---|---:|---|
| `dpi` | 300 | PDF 렌더링, 72~600 |
| `confidence_threshold` | 70 | 미만 단어 needs_review=true |
| `osd_min_confidence` | 15 | 방향 확신이 낮으면 회전 안 함 |
| `max_deskew_degrees` | 10 | 미세 기울기 최대 보정 각도 |
| `max_file_bytes` | 26214400 | 25MiB, 프론트에도 25MiB 사전 검사 |
| `max_pages` | 100 | PDF 최대 페이지 |
| `max_image_pixels` | 40000000 | 원본/페이지 렌더링 픽셀 제한 |
| `page_timeout` | 60 | 페이지 OSD+OCR 제한 초, 전체 제한 별도 적용 |
| `document_timeout` | 300 | 로딩·렌더링 포함 worker 전체 제한 초 |
| `direct_min_chars` | 10 | 직접 추출 최소 공백 제외 문자 |
| `direct_min_quality` | 0.95 | replacement/control 문자 제외 비율 |
| `uncovered_image_ratio` | 0.2 | 미인식 이미지 확인 대상 최소 페이지 면적 비율 |
| `outputs_dir` | backend/outputs 절대 경로 | 출력 위치, 상대값이면 서버 작업 디렉터리 기준 |

프론트 요청 제한은 330초다. 백엔드 전체 제한을 더 크게 변경하면 `src/api/ocr.js`의 제한도 조정한다.
방향 탐지 실패, 빈 OCR 결과는 페이지 경고로 기록한다. OSD와 Deskew는 근거가 부족하면 보정을 생략한다.

### 테스트

```sh
cd backend
.venv/bin/python -m unittest discover -s tests -v
RUN_OCR_INTEGRATION=1 .venv/bin/python -m unittest discover -s tests -v
```

실제 엔진 테스트는 이미지·PDF를 실행 중 생성하고 임시 폴더를 정리한다.
macOS 기본 폰트 경로를 사용하며 다른 환경은 `OCR_TEST_FONT`로 한글/영어 폰트를 지정한다.
폰트가 없으면 실제 텍스트 샘플 검증은 skip으로 표시한다.
프론트 테스트는 Node 22 이상에서 `node --test tests/ocr.test.js`로 실행한다.

### 2026-11-25 검증 결과

- Python 3.12.10 / Tesseract 5.5.4, kor·eng·osd 설치 확인. `pip check` 통과.
- 기본/API/실제 엔진 테스트 18개 통과. 한글·영어·혼합 PNG, JPG/JPEG, 90/180도 회전,
  Deskew, 빈 이미지, 디지털·스캔·혼합 PDF, Confidence 경계, 일부 페이지 실패,
  잘못된 입력·제한·엔진 누락·시간 초과·UTF-8 출력과 재처리 결과 보존을 검사했다.
- 합성 한글 샘플은 공백을 정규화한 핵심 문구로 확인했다. Tesseract가 단어를 분리하거나
  글자를 오인식하는 사례도 관찰했다. 이 검증은 전체 텍스트 정확도 평가가 아니다.
- 반복 문장 샘플의 OSD Confidence는 15 미만으로 자동 회전을 생략했고,
  다양한 문장의 90/180도 회전 샘플은 기본 기준 이상으로 판별·보정했다.
- Node 22.23.5에서 build 통과. lint 오류 없음(기존 useCategories 테스트의 immutability 경고 1개).
  OCR 포함 관련 node 테스트 41개와 Vitest 2개 통과.
- 전체 `npm test`는 기존 `tests/groupOrder.test.js`의 `groupOrderOf is not defined` 오류로 실패한다.
  따라서 전체 프론트 테스트 통과로 보고하지 않는다.
- TestClient의 기존 httpx 사용에 대한 Starlette deprecation 경고가 있다. 테스트는 실행됐다.
- 브라우저에서 합성 PNG 업로드 → OCR HTTP 200 → 결과 저장 완료 → 확인 화면의 JSON 경로를 확인했다.
  실제 결과 JSON에 201개 단어가 저장됐다. 캡처: `frontend/docs/screens/s2-ocr-review.jpg`.
- 복잡한 실물 문서의 OCR 정확도, 원본 위 Bounding Box 표시 UI, Windows 실행은 검증하지 않았다.

API 참고: [pytesseract](https://pypi.org/project/pytesseract/),
[PyMuPDF Page](https://pymupdf.readthedocs.io/en/latest/page.html),
[FastAPI UploadFile](https://fastapi.tiangolo.com/tutorial/request-files/).
