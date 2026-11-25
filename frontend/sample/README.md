# 샘플 문서

샘플 전용 UI, 목록, 로딩 로직과 문서 파일을 이 폴더에서 관리한다.

- `SampleDocumentsButton.jsx`: 업로드 화면에 연결하는 샘플 버튼.
- `sampleDocuments.js`: 기본 카테고리를 기준으로 검증하는 목록과 문서 URL.
- `loadSampleDocuments.js`: 문서를 가져와 업로드 흐름에 전달할 `File[]`로 변환.
- `documents/`: 버튼으로 불러오는 문서 7개. 이 중 PNG와 이미지 PDF는 텍스트 레이어가 없어 로컬 OCR을 거친다. Vite asset import로 개발·배포 경로를 생성한다.
- `fixtures/`: 수동 테스트 문서와 생성 스크립트. 사용법은 해당 폴더의 README를 따른다.

업로드 화면은 버튼에 `disabled`와 `onFiles`만 전달한다. 샘플은 공통 Button과 기본 카테고리를 사용하며, 실제 문서의 읽기·분류·저장 로직은 공통 흐름을 따른다.
`fixtures/`는 수동 테스트용으로만 유지하며 앱 배포에 포함하지 않는다.
