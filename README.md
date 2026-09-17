# doc-sorter (문서 분류기)

소규모 회사 경영지원 담당자를 위한 문서 자동 분류 웹앱.
받은 문서를 카테고리별로 나누고, 확인 후 폴더에 저장하고, CSV로 기록합니다.

결정 사항: [docs/DECISIONS.md](docs/DECISIONS.md)

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
- `docs` 결정 기록
