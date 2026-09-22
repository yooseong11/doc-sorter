import test from 'node:test'
import assert from 'node:assert/strict'
import { documentsReducer } from '../src/lib/state/documentsReducer.js'

test('reset은 목록을 비운다', () => {
    const before = [{ source: { id: 'a' } }, { source: { id: 'b' } }]
    assert.deepEqual(documentsReducer(before, { type: 'reset' }), [])
})