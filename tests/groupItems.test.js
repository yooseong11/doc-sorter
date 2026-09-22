import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryPreset, UNCLASSIFIED } from '../shared/categories.js'
import { groupItems } from '../src/groupOrder.js'

// 분류가 끝난 파일 하나. category가 파일에 '박혀' 있는 상태다.
const doc = (id, category) => ({ source: { id, name: `${id}.pdf` }, classification: { category } })

// 이름만 주면 프리셋을 만든다. 설명은 이 테스트와 상관없다.
const presetOf = (...names) => categoryPreset(names.map((name) => ({ name, hint: '' })))

// 묶음에 실제로 들어간 파일 수 = 화면에 보이는 파일 수
const visibleCount = (groups) => groups.reduce((sum, group) => sum + group.rows.length, 0)

// 분류가 끝난 뒤의 목록. 이 3개는 무슨 일이 있어도 화면에서 사라지면 안 된다.
const classified = () => [doc('a', '근태'), doc('b', '비용 증빙'), doc('c', UNCLASSIFIED)]

test('카테고리를 추가해도 이미 분류된 파일은 그대로 보인다', () => {
  assert.equal(visibleCount(groupItems(classified(), presetOf('근태', '비용 증빙', '보고서'))), 3)
})

test('카테고리 이름을 바꿔도 이미 분류된 파일이 사라지지 않는다', () => {
  // '근태' → '출퇴근'. a.pdf에는 아직 '근태'가 박혀 있다.
  assert.equal(visibleCount(groupItems(classified(), presetOf('출퇴근', '비용 증빙'))), 3)
})

test('카테고리를 지워도 이미 분류된 파일이 사라지지 않는다', () => {
  // '근태'를 삭제. a.pdf가 갈 곳이 없어진다.
  assert.equal(visibleCount(groupItems(classified(), presetOf('비용 증빙'))), 3)
})
