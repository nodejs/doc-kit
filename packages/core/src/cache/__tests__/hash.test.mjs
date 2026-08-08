import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canonicalJSON, combine, hashData, hashValue } from '../hash.mjs';

describe('hashData', () => {
  it('returns a 32-char hex hash', () => {
    assert.match(hashData('hello'), /^[0-9a-f]{32}$/);
  });

  it('differs for different data', () => {
    assert.notEqual(hashData('a'), hashData('b'));
  });
});

describe('canonicalJSON', () => {
  it('sorts object keys', () => {
    assert.equal(canonicalJSON({ b: 1, a: 2 }), canonicalJSON({ a: 2, b: 1 }));
  });

  it('sorts keys recursively', () => {
    assert.equal(
      canonicalJSON({ x: { b: 1, a: 2 } }),
      canonicalJSON({ x: { a: 2, b: 1 } })
    );
  });

  it('omits undefined object values like JSON does', () => {
    assert.equal(
      canonicalJSON({ a: 1, b: undefined }),
      canonicalJSON({ a: 1 })
    );
  });

  it('serializes undefined array items as null like JSON does', () => {
    assert.equal(canonicalJSON([undefined]), '[null]');
  });

  it('serializes functions by source text', () => {
    const fn = () => 42;

    assert.equal(canonicalJSON(fn), JSON.stringify(String(fn)));
  });

  it('throws on cycles (callers disable caching)', () => {
    const value = { a: 1 };
    value.self = value;

    assert.throws(() => canonicalJSON(value));
  });

  it('allows shared (non-cyclic) references', () => {
    const shared = { x: 1 };

    assert.equal(
      canonicalJSON({ a: shared, b: shared }),
      '{"a":{"x":1},"b":{"x":1}}'
    );
  });
});

describe('hashValue', () => {
  it('is key-order independent', () => {
    assert.equal(
      hashValue({ a: 1, b: [2, 3] }),
      hashValue({ b: [2, 3], a: 1 })
    );
  });

  it('differs for different values', () => {
    assert.notEqual(hashValue({ a: 1 }), hashValue({ a: 2 }));
  });
});

describe('combine', () => {
  it('is boundary-unambiguous', () => {
    assert.notEqual(combine('ab', 'c'), combine('a', 'bc'));
  });

  it('is deterministic', () => {
    assert.equal(combine('a', 'b'), combine('a', 'b'));
  });
});
