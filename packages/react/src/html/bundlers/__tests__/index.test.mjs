import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  default as getConfig,
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';

import { resolveBundler } from '../index.mjs';
import { compile } from '../vite.mjs';

await setConfig({
  target: ['html'],
  output: join(tmpdir(), 'doc-kit-bundler-test-output'),
  version: 'v22.0.0',
  changelog: [],
  generators: {
    html: {},
  },
});

const program = [
  'import { h as _jsx, Fragment as _Fragment } from "file:///library.mjs";',
  'export const content = () => <><h1 id="x">Hi</h1></>;',
].join('\n');

describe('resolveBundler', () => {
  it('returns a configured bundler as is', async () => {
    const bundler = { buildServer() {}, compile() {}, buildClient() {} };

    const resolved = await resolveBundler(bundler);

    assert.equal(resolved, bundler);
  });

  it('compiles with the Vite adapter, in a child process', async context => {
    const bundler = await resolveBundler();
    context.after(() => bundler.close());

    assert.equal(
      await bundler.compile(program, 'fs.jsx'),
      await compile(program, 'fs.jsx')
    );
  });

  it('builds an importable library module from a virtual entry', async context => {
    const outDir = await mkdtemp(join(tmpdir(), 'doc-kit-bundler-test-'));
    context.after(() => rm(outDir, { recursive: true, force: true }));

    const bundler = await resolveBundler();
    context.after(() => bundler.close());

    const url = await bundler.buildServer({
      entry: 'export { answer } from "virtual:answer";',
      virtualImports: { 'virtual:answer': 'export const answer = 42;' },
      outDir,
      config: getConfig('html'),
    });

    const library = await import(url);

    assert.equal(library.answer, 42);
  });

  it("rejects with the adapter's error", async context => {
    const bundler = await resolveBundler();
    context.after(() => bundler.close());

    await assert.rejects(bundler.compile('export const = ;', 'broken.jsx'));
  });
});
