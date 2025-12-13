import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it, mock } from 'node:test';

const runGenerators = mock.fn(async () => {});

mock.module('../../../src/generators.mjs', {
  defaultExport: () => ({ runGenerators }),
});

mock.module('../../../src/parsers/markdown.mjs', {
  namedExports: {
    parseChangelog: async () => [{ version: 'v1.0.0', lts: false }],
    parseIndex: async () => [{ section: 'fs', api: 'fs' }],
  },
});

mock.module('../../../src/parsers/json.mjs', {
  namedExports: {
    parseTypeMap: async () => ({ Foo: 'foo.html' }),
  },
});

const logger = {
  debug: mock.fn(),
};

mock.module('../../../src/logger/index.mjs', {
  defaultExport: logger,
});

mock.module('semver', {
  namedExports: {
    coerce: v => ({ raw: v, major: 1, minor: 2, patch: 3 }),
  },
});

// Ensure the prompt option label builder (map callback) runs during module load.
mock.module('../../../src/generators/index.mjs', {
  namedExports: {
    publicGenerators: {
      web: { name: 'web', version: '1.2.3', description: 'Web output' },
    },
  },
});

const cmd = (await import('../generate.mjs')).default;

describe('bin/commands/generate', () => {
  it('calls runGenerators with normalized options', async () => {
    await cmd.action({
      target: ['web'],
      input: ['doc/api/*.md'],
      ignore: ['**/deprecated/**'],
      output: 'out',
      version: 'v20.0.0',
      changelog: 'CHANGELOG.md',
      gitRef: 'https://example.test/ref',
      threads: '0',
      chunkSize: 'not-a-number',
      index: 'doc/api/index.md',
      typeMap: 'doc/api/type_map.json',
    });

    assert.equal(logger.debug.mock.callCount(), 2);
    assert.equal(runGenerators.mock.callCount(), 1);

    const args = runGenerators.mock.calls[0].arguments[0];

    assert.deepEqual(args.generators, ['web']);
    assert.deepEqual(args.input, ['doc/api/*.md']);
    assert.deepEqual(args.ignore, ['**/deprecated/**']);
    assert.equal(args.output, resolve('out'));

    // coerce() mocked: returns object with raw
    assert.equal(args.version.raw, 'v20.0.0');

    // min thread/chunkSize should be 1 when parseInt fails or < 1
    assert.equal(args.threads, 1);
    assert.equal(args.chunkSize, 1);

    assert.equal(args.gitRef, 'https://example.test/ref');
    assert.deepEqual(args.releases, [{ version: 'v1.0.0', lts: false }]);
    assert.deepEqual(args.index, [{ section: 'fs', api: 'fs' }]);
    assert.deepEqual(args.typeMap, { Foo: 'foo.html' });
  });
});
