import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Mock dependencies
const mockReadFile = mock.fn();
mock.module('node:fs/promises', {
  namedExports: { readFile: mockReadFile },
});

// Mock other internal modules as needed
// From src/generators/ast/__tests__/ to src/utils/configuration/index.mjs is ../../../utils/configuration/index.mjs
mock.module('../../../utils/configuration/index.mjs', {
  defaultExport: () => ({ ast: { input: 'docs/*.md' } }),
});

const { processChunk } = await import('../generate.mjs');

describe('ast/generate.mjs error handling', () => {
  it('should wrap readFile errors with filename, original message, and cause', async () => {
    const error = new Error('FS_ERROR');
    mockReadFile.mock.mockImplementation(async () => {
      throw error;
    });

    const inputSlice = ['test.md'];
    const itemIndices = [0];

    await assert.rejects(
      async () => await processChunk(inputSlice, itemIndices),
      {
        name: 'Error',
        message: 'Failed to process test.md: FS_ERROR',
        cause: error,
      }
    );
  });
});
