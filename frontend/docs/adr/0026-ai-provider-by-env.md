# 0026. 분류 AI는 AI_PROVIDER로 OpenAI와 Ollama 중에서 고른다

## 결정
backend/.env의 `AI_PROVIDER`(기본 openai)로 서버 시작 때 provider를 하나 만들어 주입하고, 응답 스키마는 서비스가 요청마다 만들어 provider에 넘긴다.

## 이유
Ollama를 고르면 본문도 PC 밖으로 나가지 않는다(0008). 스키마를 provider 밖에 두어야 provider가 분류 계약을 몰라도 되고, 테스트에서 가짜 provider를 주입할 수 있다.

## 버린 대안
- OpenAI만 사용: 외부 전송 없이 분류할 선택지가 없다.
- 요청마다 provider 생성: 연결을 재사용하지 못하고 provider 교체 지점이 서비스 안에 숨는다.
- AI 설정이 없으면 서버 시작 실패: AI와 무관한 OCR까지 쓸 수 없게 된다.
