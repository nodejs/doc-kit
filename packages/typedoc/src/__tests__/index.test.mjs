import { deepStrictEqual, ok } from 'node:assert';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { Application, OptionDefaults, ReflectionKind } from 'typedoc';

import { load } from '../index.mjs';

const FIXTURES = join(import.meta.dirname, 'fixtures');

/**
 * Converts the fixture and writes it as doc-kit Markdown into a temporary
 * directory.
 *
 * @param {Record<string, unknown>} options The `docKit*` options
 * @returns {Promise<string>} The directory
 */
const generateFixture = async options => {
  const directory = await mkdtemp(join(tmpdir(), 'doc-kit-typedoc-'));

  const app = await Application.bootstrapWithPlugins({
    plugin: [load],
    entryPoints: [join(FIXTURES, 'index.ts'), join(FIXTURES, 'utils.ts')],
    tsconfig: join(FIXTURES, 'tsconfig.json'),
    readme: 'none',
    logLevel: 'Error',
    blockTags: [...OptionDefaults.blockTags, '@kind'],
    docKit: directory,
    ...options,
  });

  const project = await app.convert();
  await app.generateOutputs(project);

  return directory;
};

/**
 * The files in a directory, by path, sorted.
 *
 * @param {string} directory
 */
const readFiles = async directory => {
  const names = await readdir(directory, { recursive: true });

  return Object.fromEntries(
    await Promise.all(
      names
        .filter(name => extname(name))
        .sort()
        .map(async name => [
          name.replaceAll('\\', '/'),
          await readFile(join(directory, name), 'utf8'),
        ])
    )
  );
};

describe('the doc-kit output', () => {
  let directory;
  let files;

  before(async () => {
    directory = await generateFixture({
      docKitBasePath: '/api/',
      docKitMemberPages: ['BuildOptions'],
    });

    files = await readFiles(directory);
  });

  after(() => rm(directory, { recursive: true, force: true }));

  it('writes a page per module, namespace, export and member page, the type map and the page list', t => {
    t.assert.snapshot(Object.keys(files));
  });

  it('renders every file', t => {
    t.assert.snapshot(files);
  });
});

describe('the doc-kit output without a type map and a page list', () => {
  let directory;

  before(async () => {
    directory = await generateFixture({
      docKitTypeMap: null,
      docKitPageList: null,
    });
  });

  after(() => rm(directory, { recursive: true, force: true }));

  it('leaves them out', async () => {
    const files = Object.keys(await readFiles(directory));

    deepStrictEqual(
      files.filter(file => extname(file) === '.json'),
      []
    );
  });
});

describe('the doc-kit output with adapted URLs', () => {
  let directory;
  let files;

  before(async () => {
    directory = await generateFixture({
      docKitUrlAdapter: (url, reflection) =>
        reflection.kindOf(ReflectionKind.Function)
          ? `api.${reflection.name}`
          : url,
    });

    files = await readFiles(directory);
  });

  after(() => rm(directory, { recursive: true, force: true }));

  it('writes pages at their adapted URLs, and links to them there', () => {
    ok('api.build.md' in files);
    ok(files['api.watch.md'].includes('](api.build.md)'));
  });
});
