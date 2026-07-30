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
  });
});
