import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryPreset, UNCLASSIFIED } from '../shared/categories.js'
import { withIds } from '../src/lib/state/categoryStore.js'
import { groupItems } from '../src/groupOrder.js'

// 분류가 끝난 파일 하나. categoryId가 파일에 '박혀' 있는 상태다. (ADR 0022)
const doc = (id, categoryId) => ({ source: { id, name: `${id}.pdf` }, classification: { categoryId } })

// id가 있는 프리셋. 실제 앱(categoryStore)과 같은 방식으로 만든다.
const presetOf = (...names) => categoryPreset(withIds(names.map((name) => ({ name, hint: '' }))))

// 묶음에 실제로 들어간 파일 수 = 화면에 보이는 파일 수
const visibleCount = (groups) => groups.reduce((sum, group) => sum + group.rows.length, 0)

test('카테고리를 추가해도 이미 분류된 파일은 그대로 보인다', () => {
  const preset = presetOf('근태', '비용 증빙')
  const [attendance, expense] = preset.categories
  const classified = [doc('a', attendance.id), doc('b', expense.id), doc('c', UNCLASSIFIED)]
  const grown = categoryPreset([...preset.categories, ...withIds([{ name: '보고서', hint: '' }])])
  assert.equal(visibleCount(groupItems(classified, grown)), 3)
})

test('카테고리 이름을 바꿔도 이미 분류된 파일이 사라지지 않는다', () => {
  const preset = presetOf('근태', '비용 증빙')
  const [attendance, expense] = preset.categories
  const classified = [doc('a', attendance.id), doc('b', expense.id), doc('c', UNCLASSIFIED)]
  // '근태' → '출퇴근'. id는 그대로라 a.pdf와의 연결이 유지된다. (ADR 0022)
  const renamed = categoryPreset(preset.categories.map((category) => (
    category.id === attendance.id ? { ...category, name: '출퇴근' } : category
  )))
  assert.equal(visibleCount(groupItems(classified, renamed)), 3)
})

test('카테고리를 지워도 이미 분류된 파일이 사라지지 않는다', () => {
  const preset = presetOf('근태', '비용 증빙')
  const [attendance, expense] = preset.categories
  const classified = [doc('a', attendance.id), doc('b', expense.id), doc('c', UNCLASSIFIED)]
  // '근태'를 삭제. a.pdf의 categoryId는 이제 어떤 카테고리도 안 가리킨다 — 미분류로 보인다. (ADR 0022)
  const removed = categoryPreset(preset.categories.filter((category) => category.id !== attendance.id))
  assert.equal(visibleCount(groupItems(classified, removed)), 3)
})

test('같은 이름으로 다시 추가해도 옛 파일과 이어지지 않는다', () => {
  const preset = presetOf('근태', '비용 증빙')
  const [attendance, expense] = preset.categories
  const classified = [doc('a', attendance.id), doc('b', expense.id)]

  // '근태' 삭제 후 같은 이름으로 다시 추가. 새 id라 옛 파일은 이어지지 않는다. (ADR 0022)
  const withoutAttendance = preset.categories.filter((category) => category.id !== attendance.id)
  const readded = categoryPreset([...withoutAttendance, ...withIds([{ name: '근태', hint: '' }])])
  const newAttendance = readded.categories.find((category) => category.name === '근태')
  assert.notEqual(newAttendance.id, attendance.id)

  const groups = groupItems(classified, readded)
  // a.pdf는 옛 id를 그대로 갖고 있어 새 '근태' 묶음이 아니라 미분류로 보인다.
  const unclassifiedGroup = groups.find((group) => group.name === UNCLASSIFIED)
  assert.ok(unclassifiedGroup.rows.some((row) => row.source.id === 'a'))
  assert.equal(visibleCount(groups), 2)
})
