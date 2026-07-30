'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { populate } from '../templates.mjs';

describe('populate', () => {
  it('should substitute template variables from config', () => {
    const result = populate('https://github.com/{repository}/blob/{ref}/', {
      repository: 'nodejs/node',
      ref: 'main',
    });
    assert.strictEqual(result, 'https://github.com/nodejs/node/blob/main/');
  });

  it('should use fallback when config value is missing', () => {
    const result = populate('{name|unknown}', {});
    assert.strictEqual(result, 'unknown');
  });

  it('should leave the placeholder as-is when no value or fallback', () => {
    const result = populate('{missing}', {});
    assert.strictEqual(result, '{missing}');
  });
});
