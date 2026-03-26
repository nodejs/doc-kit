'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { enforceArray } from '../array.mjs';

describe('enforceArray', () => {
  it('should return the same array if given an array', () => {
    const input = [1, 2, 3];
    assert.strictEqual(enforceArray(input), input);
  });

  it('should wrap a non-array value in an array', () => {
    assert.deepStrictEqual(enforceArray('hello'), ['hello']);
    assert.deepStrictEqual(enforceArray(42), [42]);
    assert.deepStrictEqual(enforceArray(true), [true]);
  });

  it('should wrap null and undefined in an array', () => {
    assert.deepStrictEqual(enforceArray(null), [null]);
    assert.deepStrictEqual(enforceArray(undefined), [undefined]);
  });

  it('should return an empty array as-is', () => {
    const input = [];
    assert.strictEqual(enforceArray(input), input);
  });
});
