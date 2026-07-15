'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  lazy,
  isPlainObject,
  isAsyncIterable,
  omitKeys,
  deepMerge,
} from '../misc.mjs';

describe('lazy', () => {
  it('should call the function only once and cache the result', () => {
    let callCount = 0;
    const fn = lazy(() => {
      callCount++;
      return 42;
    });

    assert.strictEqual(fn(), 42);
    assert.strictEqual(fn(), 42);
    assert.strictEqual(callCount, 1);
  });
});

describe('isPlainObject', () => {
  it('should return true for plain objects', () => {
    assert.strictEqual(isPlainObject({}), true);
    assert.strictEqual(isPlainObject({ a: 1 }), true);
  });

  it('should return false for arrays', () => {
    assert.strictEqual(isPlainObject([]), false);
    assert.strictEqual(isPlainObject([1, 2]), false);
  });

  it('should return false for null and primitives', () => {
    assert.strictEqual(isPlainObject(null), false);
    assert.strictEqual(isPlainObject(undefined), false);
    assert.strictEqual(isPlainObject(42), false);
    assert.strictEqual(isPlainObject('string'), false);
  });
});

describe('isAsyncIterable', () => {
  it('should return true for async generators', () => {
    async function* asyncGen() {
      yield 1;
    }

    assert.strictEqual(isAsyncIterable(asyncGen()), true);
  });

  it('should return true for objects with Symbol.asyncIterator', () => {
    const asyncIterable = {
      [Symbol.asyncIterator]() {
        return { next: async () => ({ done: true, value: undefined }) };
      },
    };

    assert.strictEqual(isAsyncIterable(asyncIterable), true);
  });

  it('should return false for regular generators', () => {
    function* syncGen() {
      yield 1;
    }

    assert.strictEqual(isAsyncIterable(syncGen()), false);
  });

  it('should return false for plain objects, arrays and primitives', () => {
    assert.strictEqual(isAsyncIterable({}), false);
    assert.strictEqual(isAsyncIterable([]), false);
    assert.strictEqual(isAsyncIterable({ async: true }), false);
    assert.strictEqual(isAsyncIterable(42), false);
    assert.strictEqual(isAsyncIterable('string'), false);
  });

  it('should return false for null and undefined', () => {
    assert.strictEqual(isAsyncIterable(null), false);
    assert.strictEqual(isAsyncIterable(undefined), false);
  });
});

describe('omitKeys', () => {
  it('should return all properties when no keys are excluded', () => {
    const obj = { a: 'hello', b: 42, c: true };
    assert.deepStrictEqual(omitKeys(obj), { a: 'hello', b: 42, c: true });
  });

  it('should omit specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    assert.deepStrictEqual(omitKeys(obj, ['a', 'c']), { b: 2 });
  });

  it('should ignore keys that do not exist', () => {
    const obj = { a: 1, b: 2 };
    assert.deepStrictEqual(omitKeys(obj, ['z']), { a: 1, b: 2 });
  });

  it('should return an empty object when all keys are excluded', () => {
    const obj = { a: 1, b: 2 };
    assert.deepStrictEqual(omitKeys(obj, ['a', 'b']), {});
  });

  it('should preserve any value type', () => {
    const fn = () => {};
    const obj = { a: fn, b: new Map(), c: null, d: [1, 2] };
    assert.deepStrictEqual(omitKeys(obj, ['b']), { a: fn, c: null, d: [1, 2] });
  });
});

describe('deepMerge', () => {
  it('should merge flat objects with latter-arguments taking precedence', () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 10, c: 3 });
    assert.deepStrictEqual(result, { a: 1, b: 10, c: 3 });
  });

  it('should merge nested objects recursively', () => {
    const result = deepMerge({ nested: { a: 1 } }, { nested: { b: 2 } });
    assert.deepStrictEqual(result, { nested: { a: 1, b: 2 } });
  });
});
