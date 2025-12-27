'use strict';

import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

let readFileCalls = 0;
let bundleAsyncCalls = 0;

mock.module('node:fs/promises', {
  namedExports: {
    readFile: async () => {
      readFileCalls += 1;
      return 'body { color: red; }';
    },
  },
});

mock.module('lightningcss', {
  namedExports: {
    bundleAsync: async ({ cssModules }) => {
      bundleAsyncCalls += 1;

      return {
        code: Buffer.from(cssModules ? '.module{}' : '.global{}'),
        exports: cssModules ? { foo: { name: '_foo_hash' } } : {},
      };
    },
  },
});

const createCssLoader = (await import('../css.mjs')).default;

describe('css loader', () => {
  it('returns empty JS for global CSS but still emits collected CSS', async () => {
    readFileCalls = 0;
    bundleAsyncCalls = 0;

    const plugin = createCssLoader();

    const result = await plugin.load.handler('C:/tmp/styles.css');
    assert.deepStrictEqual(result, {
      code: '',
      moduleType: 'js',
      moduleSideEffects: 'no-treeshake',
    });

    let emitted;
    plugin.buildEnd.call({
      emitFile(file) {
        emitted = file;
        return 'ref';
      },
    });

    assert.deepStrictEqual(emitted, {
      type: 'asset',
      name: 'styles.css',
      source: '.global{}',
    });

    assert.equal(readFileCalls, 1);
    assert.equal(bundleAsyncCalls, 1);
  });

  it('exports class mapping for CSS modules and caches results', async () => {
    readFileCalls = 0;
    bundleAsyncCalls = 0;

    const plugin = createCssLoader();

    const first = await plugin.load.handler('C:/tmp/index.module.css');
    const second = await plugin.load.handler('C:/tmp/index.module.css');

    assert.deepStrictEqual(first, {
      code: 'export default {"foo":"_foo_hash"};',
      moduleType: 'js',
      moduleSideEffects: 'no-treeshake',
    });
    assert.deepStrictEqual(second, first);

    let emitted;
    plugin.buildEnd.call({
      emitFile(file) {
        emitted = file;
        return 'ref';
      },
    });

    assert.deepStrictEqual(emitted, {
      type: 'asset',
      name: 'styles.css',
      source: '.module{}',
    });

    assert.equal(readFileCalls, 1);
    assert.equal(bundleAsyncCalls, 1);
  });
});
