import assert from 'node:assert/strict';
import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import {
  default as getConfig,
  setConfig,
} from '../../../../utils/configuration/index.mjs';
import {
  createVirtualModulesPlugin,
  createViteConfig,
  renderServerEntries,
} from '../vite.mjs';

const output = join(tmpdir(), 'doc-kit-vite-test-output');

await setConfig({
  output,
  version: 'v22.0.0',
  changelog: [],
  generators: {
    web: {},
  },
});

describe('Vite virtual modules', () => {
  it('resolves and loads only exact in-memory module identifiers', () => {
    const htmlId = resolve('api/fs.html');
    const plugin = createVirtualModulesPlugin(
      new Map([
        ['virtual:entry', 'export default 42;'],
        [htmlId, '<script type="module" src="virtual:entry"></script>'],
      ])
    );

    const entryId = plugin.resolveId('virtual:entry');
    assert.ok(entryId);
    assert.strictEqual(plugin.load(entryId), 'export default 42;');
    assert.strictEqual(plugin.resolveId('virtual:missing'), undefined);
    assert.strictEqual(plugin.resolveId(htmlId), htmlId);
    assert.strictEqual(
      plugin.load(htmlId),
      '<script type="module" src="virtual:entry"></script>'
    );
  });
});

describe('Vite configuration', () => {
  it('uses the generated client entries and configured output', () => {
    getConfig('web').vite = {
      base: '/custom/',
      build: {
        outDir: 'custom-output',
        manifest: true,
        rolldownOptions: {
          input: 'custom-entry.js',
        },
      },
    };

    const input = { fs: 'virtual:doc-kit/client/fs.jsx' };
    const config = createViteConfig({
      sources: new Map(),
      input,
      server: false,
    });

    assert.strictEqual(config.base, './');
    assert.strictEqual(config.build.outDir, output);
    assert.strictEqual(config.build.manifest, true);
    assert.strictEqual(config.build.rolldownOptions.input, input);
  });

  it('keeps the temporary SSR build self-contained', () => {
    getConfig('web').vite = {
      ssr: {
        external: ['preact'],
        noExternal: false,
      },
      build: {
        minify: true,
        rolldownOptions: {
          external: ['preact'],
        },
      },
    };

    const input = { fs: 'virtual:doc-kit/server/fs.jsx' };
    const serverOutput = join(tmpdir(), 'doc-kit-vite-ssr-test');
    const config = createViteConfig({
      sources: new Map(),
      input,
      server: true,
      serverOutDir: serverOutput,
    });

    assert.strictEqual(config.build.ssr, true);
    assert.strictEqual(config.build.outDir, serverOutput);
    assert.strictEqual(config.build.minify, false);
    assert.deepStrictEqual(config.build.rolldownOptions.external, []);
    assert.deepStrictEqual(config.ssr.external, []);
    assert.strictEqual(config.ssr.noExternal, true);
  });
});

describe('Vite SSR temporary output', () => {
  it('always removes temporary output after a renderer throws', async () => {
    getConfig('web').vite = {};
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), 'doc-kit-vite-cleanup-test-')
    );

    await assert.rejects(
      renderServerEntries(
        new Map([
          [
            'broken.jsx',
            'export default () => { throw new Error("render failed"); };',
          ],
        ]),
        {},
        async () => temporaryDirectory
      ),
      /render failed/
    );

    await assert.rejects(access(temporaryDirectory), { code: 'ENOENT' });
  });
});
