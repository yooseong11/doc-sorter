# AGENTS.md

- 대화 시작 시 `docs/STORY_MAP.md`와 `docs/adr/` 전체(0000-template 제외)를 읽고, 관련 스토리·ADR 번호를 먼저 밝힌 뒤 작업한다.
- 화면 작업일 때만 `docs/SCREEN_DESCRIPTIONS.md`의 해당 절을 읽고, 화면을 바꿨으면 그 절도 같이 고친다.
- 채택된 ADR과 충돌하는 구현은 하지 않는다. 충돌하면 작업 전에 어느 ADR인지 알린다.
- 결정을 바꾸거나 ADR `보류` 항목을 만들 때는 사용자에게 먼저 묻는다.
- ADR은 아키텍처를 바꾸는 결정만. 범위·순서·문서 운영은 스토리 맵이나 이 파일에 적는다.
- 스토리 맵에 없는 기능은 어느 활동에 속하는지 먼저 확인한다.
- 명령어: `npm run dev` / `npm run build` / `npm run lint`(oxlint) / `npm test`(node --test)
