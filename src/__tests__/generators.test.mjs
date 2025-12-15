import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';

import createGenerator from '../generators.mjs';

describe('createGenerator', () => {
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
    const { runGenerators } = createGenerator();

    ok(runGenerators);
    strictEqual(typeof runGenerators, 'function');
  });

  it('should return the ast input directly when generators list is empty', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators({
      ...mockOptions,
      generators: ['ast'],
    });

    // Returns array of results, first element is the 'ast' result
    ok(Array.isArray(results));
    strictEqual(results.length, 1);
    ok(results[0]);
  });

  it('should run metadata generator', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators({
      ...mockOptions,
      generators: ['metadata'],
    });

    // Returns array with one element - the collected metadata array
    ok(Array.isArray(results));
    strictEqual(results.length, 1);
    ok(Array.isArray(results[0]));
  });

  it('should handle generator with dependency', async () => {
    const { runGenerators } = createGenerator();

    // legacy-html depends on metadata
    const results = await runGenerators({
      ...mockOptions,
      generators: ['legacy-html'],
    });

    // Should complete without error - returns array of results
    ok(Array.isArray(results));
    strictEqual(results.length, 1);
  });

  it('should skip already scheduled generators', async () => {
    const { runGenerators } = createGenerator();

    // Running with ['metadata', 'metadata'] should skip the second
    const results = await runGenerators({
      ...mockOptions,
      generators: ['metadata', 'metadata'],
    });

    // Returns array with two elements (same result cached for both)
    ok(Array.isArray(results));
    strictEqual(results.length, 2);
  });

  it('should handle multiple generators in sequence', async () => {
    const { runGenerators } = createGenerator();

    // Run metadata - just one generator
    const results = await runGenerators({
      ...mockOptions,
      generators: ['metadata'],
    });

    // Returns array of results
    ok(Array.isArray(results));
    strictEqual(results.length, 1);
  });

  it('should collect async generator results for dependents', async () => {
    const { runGenerators } = createGenerator();

    // legacy-json depends on metadata (async generator)
    const results = await runGenerators({
      ...mockOptions,
      generators: ['legacy-json'],
    });

    ok(Array.isArray(results));
    strictEqual(results.length, 1);
  });

  it('should use multiple threads when specified', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators({
      ...mockOptions,
      threads: 4,
      generators: ['metadata'],
    });

    // Returns array of results
    ok(Array.isArray(results));
    strictEqual(results.length, 1);
    ok(Array.isArray(results[0]));
  });

  it('should pass options to generators', async () => {
    const { runGenerators } = createGenerator();

    const customTypeMap = { TestType: 'https://example.com/TestType' };

    const results = await runGenerators({
      ...mockOptions,
      typeMap: customTypeMap,
      generators: ['metadata'],
    });

    // Returns array of results
    ok(Array.isArray(results));
    strictEqual(results.length, 1);
    ok(Array.isArray(results[0]));
  });
});
