import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, expect, test, vi } from 'vitest'
import { DEFAULT_CATEGORIES } from '../shared/categories.js'
import { recallCategories, rememberCategories } from '../src/lib/state/categoryStore.js'
import { useCategories } from '../src/lib/state/useCategories.js'

// 진짜 IndexedDB 대신 가짜 함수로 바꾼다. defaultCategories 같은 나머지는 그대로 쓴다.
vi.mock('../src/lib/state/categoryStore.js', async (importOriginal) => ({
  ...(await importOriginal()),
  recallCategories: vi.fn(),
  rememberCategories: vi.fn(),
}))

// React에게 "지금 테스트 중"이라고 알려서 act 경고를 끈다.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// 훅은 컴포넌트 안에서만 돌 수 있다. 빈 컴포넌트에 훅을 넣고 결과를 밖으로 꺼낸다.
function renderUseCategories() {
  const result = { current: null }
  function Probe() {
    result.current = useCategories()
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(<Probe />))
  return { result, unmount: () => act(() => root.unmount()) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('첫 실행: 저장값이 없으면 기본 카테고리를 쓰고 저장하지 않는다', async () => {
  recallCategories.mockResolvedValue(null)

  const { result, unmount } = renderUseCategories()
  await act(async () => {}) // 불러오기(Promise)가 끝날 때까지 기다린다.

  const [categories] = result.current
  expect(categories.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name))
  expect(rememberCategories).not.toHaveBeenCalled()

  unmount()
})

test('저장값 복원: 저장된 카테고리를 불러오고, 불러온 것만으로는 저장하지 않는다', async () => {
  const stored = [
    { id: 'a', name: '근태', hint: '연차, 출퇴근' },
    { id: 'b', name: '계약서', hint: 'NDA' },
  ]
  recallCategories.mockResolvedValue(stored)

  const { result, unmount } = renderUseCategories()
  await act(async () => {})

  const [categories] = result.current
  expect(categories).toEqual(stored)
  expect(rememberCategories).not.toHaveBeenCalled()

  unmount()
  expect(rememberCategories).not.toHaveBeenCalled() // 화면이 닫혀도 고친 게 없으니 저장하지 않는다.
})
