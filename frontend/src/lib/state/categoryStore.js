// 편집한 프리셋을 브라우저에 기억한다. (ADR 0021)
// 폴더 핸들과 같은 저장소를 쓴다. (ADR 0003)

import { get, set } from 'idb-keyval'
import * as v from 'valibot'
import { DEFAULT_CATEGORIES } from '../../../shared/categories.js'
import { categoriesSchema } from '../../../shared/classifyContract.js'

const PRESET_KEY = 'doc-sorter:categories'

// id는 편집 화면이 행을 구분하려고 붙이는 값이다. 저장하지도 전송하지도 않는다. (ADR 0008)
export function withIds(categories) {
  return categories.map((category) => ({ ...category, id: crypto.randomUUID() }))
}

export function defaultCategories() {
  return withIds(DEFAULT_CATEGORIES)
}

// 저장된 값은 예전 버전이 남긴 것일 수 있다. 서버와 같은 스키마로 보고 아니면 버린다.
export async function recallCategories() {
  try {
    const stored = await get(PRESET_KEY)
    const parsed = v.safeParse(categoriesSchema, stored)
    return parsed.success ? withIds(parsed.output) : null
  } catch {
    return null
  }
}

export async function rememberCategories(categories) {
  try {
    await set(PRESET_KEY, categories.map(({ name, hint }) => ({ name, hint })))
  } catch {
    // 기억하지 못해도 이번 분류는 그대로 한다.
  }
}
