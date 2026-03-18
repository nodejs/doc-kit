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
  it('should wrap parsing errors with filename, original message, and cause', async () => {
    const error = new Error('PARSE_ERROR');
    mockParseApiDoc.mock.mockImplementation(() => {
      throw error;
    });

    const fullInput = [{ file: { path: 'docs/api/fs.md', basename: 'fs.md' } }];
    const itemIndices = [0];

    await assert.rejects(
      async () => await processChunk(fullInput, itemIndices, {}),
      {
        name: 'Error',
        message: 'Failed to parse metadata for docs/api/fs.md: PARSE_ERROR',
        cause: error,
      }
    );
  });

  it('should fallback to basename or unknown if path is missing', async () => {
    const error = new Error('PARSE_ERROR');
    mockParseApiDoc.mock.mockImplementation(() => {
      throw error;
    });

    const fullInput = [{ file: { basename: 'fs.md' } }];

    await assert.rejects(async () => await processChunk(fullInput, [0], {}), {
      name: 'Error',
      message: 'Failed to parse metadata for fs.md: PARSE_ERROR',
      cause: error,
    });
  });
});
