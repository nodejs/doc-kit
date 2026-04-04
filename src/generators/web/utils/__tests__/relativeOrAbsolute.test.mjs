import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '../../../../utils/configuration/index.mjs';
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

describe('relativeOrAbsolute (relative mode)', async () => {
  it('returns a relative path from a nested page to root', () => {
    const result = relativeOrAbsolute('/', '/api/fs');
    assert.strictEqual(result, '../..');
  });

  it('returns a relative path between sibling pages', () => {
    const result = relativeOrAbsolute('/http', '/fs');
    assert.strictEqual(result, 'http');
  });

  it('returns a relative path for a deeper target', () => {
    const result = relativeOrAbsolute('/orama-db.json', '/api/fs');
    assert.strictEqual(result, '../../orama-db.json');
  });

  it('returns "." when source and target resolve to the same path', () => {
    const result = relativeOrAbsolute('/fs', '/fs');
    assert.strictEqual(result, '.');
  });
});

describe('relativeOrAbsolute (absolute mode)', async () => {
  await setConfig({
    version: 'v22.0.0',
    changelog: [],
    generators: {
      web: {
        useAbsoluteURLs: true,
        baseURL: 'https://nodejs.org/docs',
      },
    },
  });

  // Cache-busting query param to get a fresh module with new config
  const { relativeOrAbsolute } =
    await import('../relativeOrAbsolute.mjs?absolute');

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

  it('strips trailing slash from baseURL before joining', async () => {
    await setConfig({
      version: 'v22.0.0',
      changelog: [],
      generators: {
        web: {
          useAbsoluteURLs: true,
          baseURL: 'https://nodejs.org/docs/',
        },
      },
    });

    const { relativeOrAbsolute: roa } =
      await import('../relativeOrAbsolute.mjs?trailing-slash');

    const result = roa('/fs', '/http');
    assert.strictEqual(result, 'https://nodejs.org/docs/fs');
  });
});
