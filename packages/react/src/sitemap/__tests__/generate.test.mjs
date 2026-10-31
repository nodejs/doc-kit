import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

import { generate } from '../generate.mjs';

const config = await setConfig({ target: ['sitemap'] });

config.sitemap.output = undefined;
config.sitemap.baseURL = 'https://example.com';

const entry = (api, depth = 1) => ({
  api,
  path: `/${api}`,
  heading: { depth },
});

const extractLocations = sitemap =>
  Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), match => match[1]);

describe('sitemap', () => {
  it('lists depth-1 pages alongside the index URL', async () => {
    const sitemap = await generate([
      entry('fs', 1),
      entry('fs', 2),
      entry('http', 1),
    ]);

    assert.deepEqual(extractLocations(sitemap), [
      'https://example.com/fs.html',
      'https://example.com/http.html',
      'https://example.com/',
    ]);
  });

  it('does not list the index page twice when index.md is an input', async () => {
    const sitemap = await generate([entry('index', 1), entry('foo', 1)]);

    assert.deepEqual(extractLocations(sitemap), [
      'https://example.com/foo.html',
      'https://example.com/',
    ]);
  });
});
