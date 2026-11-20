# 0013. 분류·저장 상태를 단계별 객체로 분리

## 결정
파일 객체는 `source`·`classification`·`save`로 나누고 분류와 저장에 독립 phase를 둔다. 실패 위치는 `read-failed`·`classify-failed`·`write-failed`·`log-failed`처럼 phase로 표현한다.

## 이유
단계별 데이터와 오류의 소유권이 분명해지고 `status`·`saveStatus`·`failedStage`·`fileSaved` 같은 중복 상태 없이 실패한 단계만 안전하게 재시도할 수 있다(0011).

## 버린 대안
- 평면 파일 객체와 보조 필드 유지: 단계가 늘수록 서로 모순되는 상태 조합이 생긴다.
- 하나의 통합 phase: 분류와 저장이 독립적으로 재시도되는 흐름을 표현하기 어렵다.
- `failed`와 실패 단계 보조 필드 조합: 실패 상태가 두 필드에 걸쳐 있어 함께 갱신해야 한다.
