import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Mock dependencies
const mockParseApiDoc = mock.fn();
mock.module('../utils/parse.mjs', {
  namedExports: { parseApiDoc: mockParseApiDoc },
});

// Mock configuration and URL utils
// From src/generators/metadata/__tests__/ to src/utils/ is ../../../utils/
mock.module('../../../utils/configuration/index.mjs', {
  defaultExport: () => ({ metadata: { typeMap: 'typeMap.json' } }),
});
mock.module('../../../utils/url.mjs', {
  namedExports: { importFromURL: async () => ({}) },
});

const { processChunk } = await import('../generate.mjs');

describe('metadata/generate.mjs error handling', () => {
  it('should bubble parsing errors to the caller', async () => {
    const error = new Error('PARSE_ERROR');
    mockParseApiDoc.mock.mockImplementation(() => {
      throw error;
    });

    const fullInput = [{ file: { path: 'docs/api/fs.md', basename: 'fs.md' } }];
    const itemIndices = [0];

    await assert.rejects(
      async () => await processChunk(fullInput, itemIndices, {}),
      err => {
        assert.strictEqual(err, error);
        return true;
      }
    );
  });

  it('should preserve non-Error throws from parseApiDoc', async () => {
    mockParseApiDoc.mock.mockImplementation(() => {
      throw 'PARSE_ERROR';
    });

    await assert.rejects(
      async () => await processChunk([{}], [0], {}),
      err => {
        assert.strictEqual(err, 'PARSE_ERROR');
        return true;
      }
    );
  });
});
