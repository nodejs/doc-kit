import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  default as getConfig,
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';

import {
  buildServer,
  compile,
  createVirtualModulesPlugin,
  createViteConfig,
} from '../vite.mjs';

const output = join(tmpdir(), 'doc-kit-vite-test-output');

await setConfig({
  target: ['html'],
  output,
  version: 'v22.0.0',
  changelog: [],
  generators: {
    html: {},
  },
});

describe('Vite virtual modules', () => {
  it('resolves and loads only exact in-memory module identifiers', () => {
    const plugin = createVirtualModulesPlugin(
      new Map([['virtual:entry', 'export default 42;']])
    );

    const entryId = plugin.resolveId('virtual:entry');
    assert.ok(entryId);
    assert.strictEqual(plugin.load(entryId), 'export default 42;');
    assert.strictEqual(plugin.resolveId('virtual:missing'), undefined);
    assert.strictEqual(plugin.load('/real/file.js'), undefined);
  });
});

describe('Vite configuration', () => {
  it('uses the generated client entry and configured output', () => {
    const vite = {
      base: '/custom/',
      build: {
        outDir: 'custom-output',
        rolldownOptions: {
          input: 'custom-entry.js',
        },
      },
    };

    const input = { client: 'virtual:doc-kit/client/index.jsx' };
    const config = createViteConfig({
      sources: new Map(),
      input,
      server: false,
      outDir: output,
      config: getConfig('html'),
      vite,
    });

    assert.strictEqual(config.base, './');
    assert.strictEqual(config.build.outDir, output);
    // A manifest is always written for the client: the asset tags come from it
    assert.strictEqual(config.build.manifest, '.vite/manifest.json');
    assert.strictEqual(config.build.rolldownOptions.input, input);
  });

  it('keeps a manifest the project asked for', () => {
    const config = createViteConfig({
      sources: new Map(),
      input: {},
      server: false,
      outDir: output,
      config: getConfig('html'),
      vite: { build: { manifest: 'manifest.json' } },
    });

    assert.strictEqual(config.build.manifest, 'manifest.json');
  });

  it("leaves out module-level directive warnings unless they're asked for", () => {
    /**
     * @param {import('vite').UserConfig} [vite]
     */
    const checksFor = vite =>
      createViteConfig({
        sources: new Map(),
        input: {},
        server: false,
        outDir: output,
        config: getConfig('html'),
        vite,
      }).build.rolldownOptions.checks;

    assert.deepStrictEqual(checksFor(), { moduleLevelDirective: false });

    const checks = { moduleLevelDirective: true, eval: false };

    assert.deepStrictEqual(
      checksFor({ build: { rolldownOptions: { checks } } }),
      checks
    );
  });

  it('keeps the server library self-contained', () => {
    const vite = {
      ssr: {
        external: ['preact'],
        noExternal: false,
      },
      build: {
        minify: true,
        manifest: true,
        rolldownOptions: {
          external: ['preact'],
        },
      },
    };

    const input = { library: 'virtual:doc-kit/server/library.jsx' };
    const serverOutput = join(tmpdir(), 'doc-kit-vite-ssr-test');
    const config = createViteConfig({
      sources: new Map(),
      input,
      server: true,
      outDir: serverOutput,
      config: getConfig('html'),
      vite,
    });

    assert.strictEqual(config.build.ssr, true);
    assert.strictEqual(config.build.outDir, serverOutput);
    assert.strictEqual(config.build.minify, false);
    assert.strictEqual(config.build.manifest, false);
    assert.deepStrictEqual(config.build.rolldownOptions.external, []);
    assert.deepStrictEqual(config.ssr.external, []);
    assert.strictEqual(config.ssr.noExternal, true);
  });
});

describe('Vite page compilation', () => {
  it('compiles JSX to the runtime bindings a page program imports', async () => {
    const code = await compile(
      [
        'import { h as _jsx, Fragment as _Fragment, Layout } from "file:///library.mjs";',
        'export const content = () => <><h1 id="x">Hi</h1></>;',
        'export default () => <Layout metadata={{ api: "fs" }}>{content()}</Layout>;',
      ].join('\n'),
      'fs.jsx'
    );

    assert.match(code, /_jsx\(_Fragment, null, .*_jsx\("h1", \{/s);
    assert.match(code, /_jsx\(Layout, \{/);
    // Nothing else is pulled in: the runtime is the program's own import
    assert.doesNotMatch(code, /jsx-runtime/);
  });

  it('builds an importable library module from a virtual entry', async context => {
    const outDir = await mkdtemp(join(tmpdir(), 'doc-kit-vite-library-test-'));
    context.after(() => rm(outDir, { recursive: true, force: true }));

    const url = await buildServer({
      entry:
        'export { h, Fragment } from "preact"; export { answer } from "virtual:answer";',
      virtualImports: { 'virtual:answer': 'export const answer = 42;' },
      outDir,
      config: getConfig('html'),
    });

    const library = await import(url);

    assert.strictEqual(library.answer, 42);
    assert.strictEqual(typeof library.h, 'function');
  });
});
