import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generate } from '../generate.mjs';

/**
 * A page as `jsx-ast` gives it.
 *
 * @param {string} api
 * @param {string} name
 * @param {object} [extra] - More of its metadata
 */
const createPage = (api, name, extra = {}) => ({
  data: { api, heading: { depth: 1, data: { name } }, ...extra },
  headings: [{ slug: api }],
  content: '<></>',
});

/**
 * Reads every batch the generator yields.
 *
 * @param {AsyncIterable<Array<object>> | Array<object>} input
 */
const run = async input => {
  const batches = [];

  for await (const batch of generate(input)) {
    batches.push(batch);
  }

  return batches;
};

describe('html-all', () => {
  const zlib = createPage('zlib', 'Zlib');
  const fs = createPage('fs', 'File system');
  const index = createPage('index', 'Index');
  const chunk = createPage('fs/promises', 'fs.promises', { chunk: {} });
  const notFound = createPage('404', 'Page not found', { synthetic: true });

  it('adds all.html right after its last part, in sidebar order', async () => {
    async function* input() {
      yield [zlib];
      yield [{ manifest: [zlib.data, fs.data, index.data, notFound.data] }];
      yield [index, fs];
      yield [chunk, notFound];
    }

    const batches = await run(input());

    assert.deepEqual(batches[0], [zlib]);

    const [{ manifest }] = batches[1];

    assert.deepEqual(manifest.slice(0, -1), [
      zlib.data,
      fs.data,
      index.data,
      notFound.data,
    ]);
    assert.equal(manifest.at(-1).api, 'all');

    const [, , all] = batches[2];

    assert.deepEqual(batches[2].slice(0, 2), [index, fs]);
    assert.equal(all.data.api, 'all');
    assert.deepEqual(all.parts, ['fs', 'zlib']);
    assert.deepEqual(all.headings, [{ slug: 'fs' }, { slug: 'zlib' }]);

    assert.deepEqual(batches[3], [chunk, notFound]);
  });

  it('adds all.html after every page given at once, as with one thread', async () => {
    const batches = await run([zlib, fs, { manifest: [zlib.data, fs.data] }]);

    const pages = batches.flat();

    assert.equal(pages.at(-1).data.api, 'all');
    assert.deepEqual(pages.at(-1).parts, ['fs', 'zlib']);
  });
});
