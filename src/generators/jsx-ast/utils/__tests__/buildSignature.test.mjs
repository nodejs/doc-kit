import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateSignature } from '../buildSignature.mjs';

describe('generateSignature', () => {
  it('formats union return types without spaces as spaced ("|" surrounded)', () => {
    const sig = generateSignature(
      'foo',
      {
        params: [],
        return: { type: 'string|number' },
      },
      ''
    );

    assert.equal(sig, 'foo(): string | number');
  });

  it('preserves already spaced union return types', () => {
    const sig = generateSignature(
      'bar',
      {
        params: [],
        return: { type: 'Promise<string> | undefined' },
      },
      ''
    );

    assert.equal(sig, 'bar(): Promise<string> | undefined');
  });

  it('omits return type when undefined', () => {
    const sig = generateSignature(
      'baz',
      {
        params: [],
        return: undefined,
      },
      ''
    );

    assert.equal(sig, 'baz()');
  });
});
