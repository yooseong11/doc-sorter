# AGENTS.md

## 읽어야 하는 문서

### 항상 — 대화를 시작하면 무조건

1. [docs/STORY_MAP.md](docs/STORY_MAP.md) — 사용자와 스토리 라인, 릴리스 맵
2. [docs/adr/README.md](docs/adr/README.md) — ADR 작성 규칙
3. `docs/adr/` 안의 모든 ADR 파일 (`0000-template.md` 제외)

읽은 뒤 요청과 관련된 스토리와 ADR 번호를 먼저 짧게 밝히고 작업을 시작합니다.

### 상황에 따라 — 해당 작업일 때만

- **화면을 만들거나 고치는 작업** → [docs/SCREEN_DESCRIPTIONS.md](docs/SCREEN_DESCRIPTIONS.md)에서 해당 화면 절을 먼저 읽고, 화면을 바꿨으면 그 절도 같이 고칩니다. 화면 작업이 아니면 읽지 않습니다.

## 작업 규칙

- **ADR과 충돌하는 구현을 하지 않습니다.** 요청이 채택된 ADR과 부딪히면 작업 전에 어느 ADR과 충돌하는지 알립니다.
- **결정을 바꿔야 하면** 기존 ADR을 고치지 않고 새 ADR을 씁니다. 옛 ADR의 상태는 `대체됨(→ NNNN)`으로 바꿉니다. ([docs/adr/README.md](docs/adr/README.md) 규칙)
- **ADR에서 `보류`인 항목은 요청이 없으면 만들지 않습니다.**
- **ADR은 아키텍처를 바꾸는 결정만 씁니다.** 범위·순서·문서 운영처럼 되돌리기 쉬운 결정은 ADR이 아니라 스토리 맵이나 이 파일에 적습니다.
- 스토리 맵에 없는 기능을 만들게 되면 스토리 맵의 어느 활동에 들어가는지 먼저 확인합니다.

## 명령어

- `npm run dev` 개발 서버
- `npm run build` 빌드
- `npm run lint` oxlint
- `npm test` 테스트 (node --test)
