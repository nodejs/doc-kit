import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  setConfig,
  default as getConfig,
} from '../../../../utils/configuration/index.mjs';
import { relativeOrAbsolute } from '../relativeOrAbsolute.mjs';

await setConfig({
  version: 'v22.0.0',
  changelog: [],
  generators: {
    web: {
      useAbsoluteURLs: false,
      baseURL: 'https://nodejs.org/docs',
    },
  },
});

describe('relativeOrAbsolute (relative mode)', () => {
  beforeEach(() => {
    getConfig('web').useAbsoluteURLs = false;
  });

  it('returns a relative path from a nested page to root', () => {
    const result = relativeOrAbsolute('/', '/api/fs');
    assert.strictEqual(result, '..');
  });

  it('returns a relative path between sibling pages', () => {
    const result = relativeOrAbsolute('/http', '/fs');
    assert.strictEqual(result, 'http');
  });

  it('returns a relative path for a deeper target', () => {
    const result = relativeOrAbsolute('/orama-db.json', '/api/fs');
    assert.strictEqual(result, '../orama-db.json');
  });

  it('returns "." when source and target resolve to the same path', () => {
    const result = relativeOrAbsolute('/', '/');
    assert.strictEqual(result, '.');
  });
});

describe('relativeOrAbsolute (absolute mode)', () => {
  beforeEach(() => {
    getConfig('web').useAbsoluteURLs = true;
  });

  it('returns an absolute URL to root', () => {
    const result = relativeOrAbsolute('/', '/api/fs');
    assert.strictEqual(result, 'https://nodejs.org/docs/');
  });

  it('returns an absolute URL for a page path', () => {
    const result = relativeOrAbsolute('/http', '/fs');
    assert.strictEqual(result, 'https://nodejs.org/docs/http');
  });

  it('returns an absolute URL for a resource', () => {
    const result = relativeOrAbsolute('/orama-db.json', '/api/fs');
    assert.strictEqual(result, 'https://nodejs.org/docs/orama-db.json');
  });
});
