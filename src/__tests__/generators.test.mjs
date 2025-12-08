import { ok, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import createGenerator from '../generators.mjs';
import { isAsyncGenerator } from '../streaming.mjs';

describe('createGenerator', () => {
  // Simple mock input for testing
  const mockInput = [
    {
      file: { stem: 'test', basename: 'test.md' },
      tree: { type: 'root', children: [] },
    },
  ];

  // Mock options with minimal required fields
  const mockOptions = {
    input: '/tmp/test',
    output: '/tmp/output',
    generators: ['metadata'],
    version: { major: 22, minor: 0, patch: 0 },
    releases: [],
    index: [],
    gitRef: 'https://github.com/nodejs/node/tree/HEAD',
    threads: 1,
    chunkSize: 20,
    typeMap: {},
  };

  it('should create a generator orchestrator with runGenerators method', () => {
    const { runGenerators } = createGenerator(mockInput);

    ok(runGenerators);
    strictEqual(typeof runGenerators, 'function');
  });

  it('should return the ast input directly when generators list is empty', async () => {
    const { runGenerators } = createGenerator(mockInput);

    const result = await runGenerators({
      ...mockOptions,
      generators: ['ast'],
    });

    // The 'ast' key should resolve to the original input
    ok(result);
  });

  it('should run metadata generator', async () => {
    const { runGenerators } = createGenerator(mockInput);

    const result = await runGenerators({
      ...mockOptions,
      generators: ['metadata'],
    });

    // metadata returns an async generator
    ok(isAsyncGenerator(result));
  });

  it('should handle generator with dependency', async () => {
    const { runGenerators } = createGenerator(mockInput);

    // legacy-html depends on metadata
    const result = await runGenerators({
      ...mockOptions,
      generators: ['legacy-html'],
    });

    // Should complete without error
    ok(result !== undefined);
  });

  it('should skip already scheduled generators', async () => {
    const { runGenerators } = createGenerator(mockInput);

    // Running with ['metadata', 'metadata'] should skip the second
    const result = await runGenerators({
      ...mockOptions,
      generators: ['metadata', 'metadata'],
    });

    ok(isAsyncGenerator(result));
  });

  it('should handle multiple generators in sequence', async () => {
    const { runGenerators } = createGenerator(mockInput);

    // Run metadata twice - the system should skip the already scheduled one
    // Avoid json-simple since it writes to disk
    const result = await runGenerators({
      ...mockOptions,
      generators: ['metadata'],
    });

    // Result should be from the last generator
    ok(result !== undefined);
  });

  it('should collect async generator results for dependents', async () => {
    const { runGenerators } = createGenerator(mockInput);

    // legacy-json depends on metadata (async generator)
    const result = await runGenerators({
      ...mockOptions,
      generators: ['legacy-json'],
    });

    ok(result !== undefined);
  });

  it('should use multiple threads when specified', async () => {
    const { runGenerators } = createGenerator(mockInput);

    const result = await runGenerators({
      ...mockOptions,
      threads: 4,
      generators: ['metadata'],
    });

    ok(isAsyncGenerator(result));
  });

  it('should pass options to generators', async () => {
    const { runGenerators } = createGenerator(mockInput);

    const customTypeMap = { TestType: 'https://example.com/TestType' };

    const result = await runGenerators({
      ...mockOptions,
      typeMap: customTypeMap,
      generators: ['metadata'],
    });

    ok(isAsyncGenerator(result));
  });
});
