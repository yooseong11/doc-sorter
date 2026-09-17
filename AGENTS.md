# AGENTS.md

## 대화를 시작하면 무조건 먼저 읽기

1. [docs/STORY_MAP.md](docs/STORY_MAP.md) — 사용자와 스토리 라인
2. [docs/adr/README.md](docs/adr/README.md) — ADR 목록과 작성 규칙
3. `docs/adr/` 안의 모든 ADR 파일 (`0000-template.md` 제외)

읽은 뒤 요청과 관련된 스토리와 ADR 번호를 먼저 짧게 밝히고 작업을 시작합니다.

## 작업 규칙

- **ADR과 충돌하는 구현을 하지 않습니다.** 요청이 채택된 ADR과 부딪히면 작업 전에 어느 ADR과 충돌하는지 알립니다.
- **결정을 바꿔야 하면** 기존 ADR을 고치지 않고 새 ADR을 씁니다. 옛 ADR의 상태는 `대체됨(→ NNNN)`으로 바꿉니다. ([docs/adr/README.md](docs/adr/README.md) 규칙)
- **ADR에서 `보류`인 항목은 요청이 없으면 만들지 않습니다.**
- 스토리 맵에 없는 기능을 만들게 되면 스토리 맵의 어느 활동에 들어가는지 먼저 확인합니다.

## 명령어

- `npm run dev` 개발 서버
- `npm run build` 빌드
- `npm run lint` oxlint
- `npm test` 테스트 (node --test)
