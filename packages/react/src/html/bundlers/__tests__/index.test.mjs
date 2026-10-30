import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

mock.module('../vite.mjs', {
  namedExports: { createViteBundler: () => 'vite' },
});

const { resolveBundler } = await import('../index.mjs');

const VARIABLES = [
  'ROLLDOWN_WORKER_THREADS',
  'RAYON_NUM_THREADS',
  'MIMALLOC_PURGE_DELAY',
  'MIMALLOC_ALLOW_THP',
];

const original = Object.fromEntries(
  VARIABLES.map(name => [name, process.env[name]])
);

afterEach(() => {
  for (const name of VARIABLES) {
    if (original[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original[name];
    }
  }
});

describe('resolveBundler', () => {
  it("sizes the bundler's thread pools and allocator before loading it", async () => {
    await setConfig({ target: ['html'], threads: 3 });

    for (const name of VARIABLES) {
      delete process.env[name];
    }

    assert.equal(await resolveBundler(), 'vite');
    assert.equal(process.env.ROLLDOWN_WORKER_THREADS, '3');
    assert.equal(process.env.RAYON_NUM_THREADS, '3');
    assert.equal(process.env.MIMALLOC_PURGE_DELAY, '0');
    assert.equal(process.env.MIMALLOC_ALLOW_THP, '0');
  });

  it('keeps what the environment already sets', async () => {
    await setConfig({ target: ['html'], threads: 3 });

    process.env.ROLLDOWN_WORKER_THREADS = '8';
    process.env.MIMALLOC_PURGE_DELAY = '250';

    await resolveBundler();

    assert.equal(process.env.ROLLDOWN_WORKER_THREADS, '8');
    assert.equal(process.env.MIMALLOC_PURGE_DELAY, '250');
  });

  it('leaves the environment alone for a custom bundler', async () => {
    for (const name of VARIABLES) {
      delete process.env[name];
    }

    const bundler = {};

    assert.equal(await resolveBundler(bundler), bundler);

    for (const name of VARIABLES) {
      assert.equal(process.env[name], undefined);
    }
  });
});
