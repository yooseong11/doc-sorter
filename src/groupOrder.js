// 카테고리 계약은 shared/categories.js에 있다. 여기는 화면 전용 순서·묶음만 둔다. (ADR 0016)
import { UNCLASSIFIED } from '../shared/categories.js'

// 확인 화면의 묶음 순서. 손이 가야 하는 미분류를 맨 위에 둔다.
// 목록이 런타임 상태라 상수가 아니라 프리셋을 받는 함수다. (ADR 0019)
export function groupOrderOf(preset) {
  return [UNCLASSIFIED, ...preset.names]
}

// 파일을 카테고리별로 묶는다. ConfirmScreen.jsx에 박혀 있던 로직을 옮긴 것이다.
// 카테고리를 고치거나 지워도 이미 분류된 파일은 사라지면 안 되므로(ADR 0022),
// 지금 프리셋에 없는 값이라도 버리지 않고 그 값 자체를 이름으로 한 묶음에 남긴다.
export function groupItems(items, preset) {
  const groups = groupOrderOf(preset).map((name) => ({ name, rows: [] }))
  const indexOf = new Map(groups.map((group, index) => [group.name, index]))
  const orphans = new Map()

  for (const item of items) {
    const name = item.classification.category
    const index = indexOf.get(name)
    if (index !== undefined) {
      groups[index].rows.push(item)
      continue
    }
    if (!orphans.has(name)) orphans.set(name, { name, rows: [] })
    orphans.get(name).rows.push(item)
  }

  return [...groups, ...orphans.values()].filter((group) => group.rows.length > 0)
}
