import test from 'node:test';
import assert from 'node:assert/strict'
import { groupOrderOf } from '../src/groupOrder.js';
import { UNCLASSIFIED, categoryPreset } from '../shared/categories.js';

test('미분류 묶음이 맨 위에 온다', () => {
    const list = groupOrderOf(categoryPreset());
    assert.equal(list[0], UNCLASSIFIED)
});