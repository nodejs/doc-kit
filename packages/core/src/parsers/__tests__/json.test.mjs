import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

let content;
mock.module('../../utils/parser.mjs', {
  namedExports: {
    loadFromURL: async () => content,
  },
});

const { parseTypeMap } = await import('../json.mjs');

describe('parseTypeMap', () => {
  it('should return an empty object when path is falsy', async () => {
    for (const falsy of [undefined, null, '']) {
      assert.deepStrictEqual(await parseTypeMap(falsy), {});
    }
  });

  it('should parse and return the JSON content from a given path', async () => {
    content = JSON.stringify({ Buffer: 'buffer.md', fs: 'fs.md' });
    const result = await parseTypeMap('/some/path/types.json');
    assert.deepStrictEqual(result, { Buffer: 'buffer.md', fs: 'fs.md' });
  });

  it('should throw a SyntaxError when content is not valid JSON', async () => {
    content = 'not valid json';
    await assert.rejects(
      () => parseTypeMap('/some/path/types.json'),
      SyntaxError
    );
  });
});
