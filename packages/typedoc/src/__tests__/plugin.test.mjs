import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { Application, OptionDefaults } from 'typedoc';

const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('the doc-kit output', () => {
  let directory;
  let files;

  before(async () => {
    directory = await mkdtemp(join(tmpdir(), 'doc-kit-typedoc-'));

    const app = await Application.bootstrapWithPlugins({
      plugin: [join(import.meta.dirname, '../index.mjs')],
      entryPoints: [join(FIXTURES, 'index.ts')],
      tsconfig: join(FIXTURES, 'tsconfig.json'),
      readme: 'none',
      logLevel: 'Error',
      blockTags: [...OptionDefaults.blockTags, '@kind'],
      outputs: [{ name: 'doc-kit', path: directory }],
      docKitBasePath: '/api',
      docKitMemberPages: ['BuildOptions'],
      docKitEvents: { Watcher: 'WatcherEvents' },
    });

    const project = await app.convert();
    await app.generateOutputs(project);

    const names = (await readdir(directory)).sort();

    files = Object.fromEntries(
      await Promise.all(
        names.map(async name => [
          name,
          await readFile(join(directory, name), 'utf8'),
        ])
      )
    );
  });

  after(() => rm(directory, { recursive: true, force: true }));

  it('writes a page per export and member page, the type map and the page list', t => {
    t.assert.snapshot(Object.keys(files));
  });

  for (const page of [
    'Function.build.md',
    'Function.watch.md',
    'Interface.BuildOptions.md',
    'Interface.WatchOptions.md',
    'BuildOptions.output.md',
    'Class.Watcher.md',
    'TypeAlias.Format.md',
    'Variable.VERSION.md',
    'type-map.json',
    'pages.json',
  ]) {
    it(`renders ${page}`, t => {
      t.assert.snapshot(files[page]);
    });
  }
});
