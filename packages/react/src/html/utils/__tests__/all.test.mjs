import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAllPage } from '../all.mjs';

const createPage = (api, name, { depth = 1, chunk, synthetic } = {}) => ({
  data: {
    api,
    path: `/${api}`,
    basename: api,
    chunk,
    synthetic,
    heading: { depth, data: { name, text: name, slug: api } },
  },
  headings: [{ depth, value: name, slug: api }],
  readingTime: '1 min read',
  content: `<><h1>${name}</h1></>`,
});

describe('buildAllPage', () => {
  it('returns a synthetic `all` page made of the module pages, in sidebar order', () => {
    const page = buildAllPage([
      createPage('zlib', 'Zlib'),
      createPage('index', 'Index'),
      createPage('fs', 'File system'),
      createPage('404', 'Page Not Found', { synthetic: true }),
      createPage('fs-readfile', 'readFile', { chunk: { api: 'fs' } }),
    ]);

    assert.equal(page.data.api, 'all');
    assert.equal(page.data.path, '/all');
    assert.equal(page.data.heading.data.name, 'All');
    assert.equal(page.data.synthetic, true);
    // The index, the other synthetic pages and the chunk pages are left out
    assert.deepEqual(page.parts, ['fs', 'zlib']);
    assert.deepEqual(
      page.headings.map(({ value }) => value),
      ['File system', 'Zlib']
    );
    // A reading time makes no sense for the whole reference
    assert.equal('readingTime' in page, false);
  });
});
