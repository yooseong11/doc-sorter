// 카테고리 계약은 shared/categories.js에 있다. 여기는 화면 전용 순서만 둔다. (ADR 0016)
import { UNCLASSIFIED } from '../shared/categories.js'

// 확인 화면의 묶음 순서. 손이 가야 하는 미분류를 맨 위에 둔다.
// 목록이 런타임 상태라 상수가 아니라 프리셋을 받는 함수다. (ADR 0019)
export function groupOrderOf(preset) {
  return [UNCLASSIFIED, ...preset.names]
}
