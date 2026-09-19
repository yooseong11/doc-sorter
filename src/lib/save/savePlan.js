// 저장 계획 — 어떤 이름으로 어디에 들어갈지 미리 정한다. (ADR 0005 · 0013)
// 원래 파일명을 유지하고, 같은 이름이 있으면 `_2`, `_3` … 을 붙인다. 덮어쓰지 않는다.
// 계획 단계에서는 폴더를 만들지 않는다. 읽기만 하고, 폴더 생성은 쓰기 직전에 한다.

import { savePath, withSuffix } from './savePath.js'

// 폴더 안에 이미 있는 파일 이름. 하위 폴더는 이름 충돌 대상이 아니다.
export async function takenNames(directoryHandle) {
  const names = new Set()
  if (!directoryHandle) return names
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'file') names.add(entry.name)
  }
  return names
}

// 순수 함수. 이미 있는 이름과 부딪히지 않는 첫 이름을 고른다.
export function uniqueName(taken, name) {
  if (!taken.has(name)) return { savedName: name, renamed: false }
  for (let n = 2; ; n += 1) {
    const candidate = withSuffix(name, n)
    if (!taken.has(candidate)) return { savedName: candidate, renamed: true }
  }
}

// 카테고리 폴더가 없으면 아직 아무것도 안 쓴 것이므로 빈 목록으로 본다. (ADR 0014 — 미분류도 같은 폴더)
async function namesIn(rootHandle, category) {
  try {
    return await takenNames(await rootHandle.getDirectoryHandle(category))
  } catch {
    return new Set()
  }
}

// 파일이 이미 디스크에 쓰였는지. 저장 완료거나, 파일은 썼지만 기록만 실패한 경우 둘 다 해당한다. (ADR 0013)
function alreadyWritten(save) {
  return save.phase === 'saved' || save.phase === 'log-failed'
}

// 한 배치 안에서 같은 이름이 둘이면 서로도 충돌이다. 정한 이름을 계속 넣어 두고 순차로 고른다.
// 이미 저장된 항목은 이름을 그대로 둔다. 다시 계획하면 자기 파일과 부딪혀 `_2`가 붙는다.
export async function planSaves(items, rootHandle) {
  const cache = new Map()
  const planned = []

  for (const item of items) {
    const category = item.classification.category
    if (!cache.has(category)) cache.set(category, await namesIn(rootHandle, category))
    const taken = cache.get(category)

    if (alreadyWritten(item.save)) {
      // 이미 디스크에 있는 이름이다. 다시 고르면 `_2`가 붙어 같은 파일이 둘 생긴다.
      taken.add(item.save.savedName)
      planned.push(item)
      continue
    }

    const { savedName, renamed } = uniqueName(taken, item.source.name)
    taken.add(savedName)
    planned.push({
      ...item,
      save: {
        ...item.save,
        phase: 'planned',
        savedName,
        renamed,
        target: savePath(category, savedName),
        error: null,
      },
    })
  }

  return planned
}
