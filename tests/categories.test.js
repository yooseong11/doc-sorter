import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryIssues, hasBlockingIssue, categoryPreset, UNCLASSIFIED } from '../shared/categories.js'
import { inputSchema, MAX_CATEGORIES } from '../shared/classifyContract.js'
import * as v from 'valibot'

const category = (name, hint = '설명') => ({ name, hint })

test('빈 이름·미분류·중복은 분류를 막는다', () => {
  const issues = categoryIssues([category(''), category(UNCLASSIFIED), category('근태'), category('근태')])
  assert.deepEqual(issues.map((issue) => issue?.level), ['block', 'block', 'block', 'block'])
  assert.equal(hasBlockingIssue([category('')]), true)
})

test('앞뒤 공백만 다른 이름도 중복으로 본다', () => {
  // 계약(strictObject)이 trim한 뒤 검사하므로 화면도 같은 기준으로 봐야 한다.
  assert.equal(hasBlockingIssue([category('근태'), category('  근태  ')]), true)
  assert.equal(hasBlockingIssue([category('   ')]), true)
})

test('설명이 비면 경고만 하고 분류는 막지 않는다', () => {
  // 설명은 검증하지 않는다. (ADR 0020)
  const issues = categoryIssues([category('근태', ''), category('계약서', '   ')])
  assert.deepEqual(issues.map((issue) => issue?.level), ['warn', 'warn'])
  assert.equal(hasBlockingIssue([category('근태', '')]), false)
})

test('문제가 없으면 null이고 프리셋도 만들어진다', () => {
  const list = [category('근태', '연차, 출퇴근'), category('계약서', 'NDA')]
  assert.deepEqual(categoryIssues(list), [null, null])
  assert.equal(hasBlockingIssue(list), false)
  assert.deepEqual(categoryPreset(list).options, ['근태', '계약서', UNCLASSIFIED])
})

test('화면이 막는 것과 서버 스키마가 막는 것이 어긋나지 않는다', () => {
  // 화면에서 통과한 목록은 서버도 받아야 한다. 상한만큼 채워도 마찬가지다.
  const full = Array.from({ length: MAX_CATEGORIES }, (_, at) => category(`분류 ${at}`, ''))
  assert.equal(hasBlockingIssue(full), false)
  assert.equal(v.safeParse(inputSchema, { name: 'a.pdf', text: '내용', categories: full }).success, true)

  // 상한을 넘기면 화면은 막지 못하고 서버가 막는다. 추가 버튼이 개수를 막아야 하는 이유다.
  const over = [...full, category('하나 더')]
  assert.equal(v.safeParse(inputSchema, { name: 'a.pdf', text: '내용', categories: over }).success, false)
})
