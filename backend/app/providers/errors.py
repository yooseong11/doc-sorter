class AIProviderError(Exception):
    "외부 AI 호출에서 생긴 예외의 공통 부모 클래스"

class ProviderConnectionError(AIProviderError):
    "Provider 연결 실패"

class ProviderTimeoutError(AIProviderError):
    "Provider 응답 시간 초과"

class ProviderUpstreamError(AIProviderError):
    "Provider가 오류 상태 반환"

class ProviderResponseError(AIProviderError):
    "Provider 응답 내용 또는 형식 오류"