import { execFile } from 'node:child_process';
import {
  appendFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

const CLI = join(import.meta.dirname, '../packages/cli/bin/cli.mjs');

const DOCUMENTS = {
  fs: '# File system\n\nReads and writes files.\n',
  path: '# Path\n\nWorks with file paths.\n',
  zlib: '# Zlib\n\nCompresses and decompresses.\n',
};

// Each test runs the real CLI, worker threads included, against the output
// the previous test left
test.describe.configure({ mode: 'serial' });

test.describe('Incremental builds', () => {
  let root;
  let input;
  let output;

  /**
   * Runs an incremental build of the site and its JSON.
   */
  const build = () =>
    promisify(execFile)(process.execPath, [
      CLI,
      'generate',
      ...['-t', 'html', '-t', 'json'],
      ...['-i', join(input, '*.md')],
      ...['-o', output],
      '--experimental-incremental',
    ]);

  /**
   * The modification time of every page and JSON document, by path. Client
   * assets are excluded, as they are written on every build.
   */
  const builtFiles = async () => {
    const entries = await readdir(output, {
      recursive: true,
      withFileTypes: true,
    });

    const files = entries
      .filter(entry => entry.isFile())
      .map(entry => relative(output, join(entry.parentPath, entry.name)))
      .filter(file => /^[^./][^/]*\.(html|json)$/.test(file));

    return Object.fromEntries(
      await Promise.all(
        files
          .toSorted()
          .map(async file => [file, (await stat(join(output, file))).mtimeMs])
      )
    );
  };

  /**
   * The files whose modification time differs between two builds.
   */
  const changedBetween = (before, after) =>
    Object.keys(after).filter(file => after[file] !== before[file]);

  test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'doc-kit-incremental-e2e-'));
    input = join(root, 'docs');
    output = join(root, 'out');

    await mkdir(input);

    for (const [name, content] of Object.entries(DOCUMENTS)) {
      await writeFile(join(input, `${name}.md`), content);
    }

    await build();
  });

  test.afterAll(() => rm(root, { recursive: true, force: true }));

  test('leaves every file alone when nothing changed', async () => {
    const before = await builtFiles();

    expect(Object.keys(before)).toEqual([
      '404.html',
      'all.html',
      'fs.html',
      'fs.json',
      'path.html',
      'path.json',
      'zlib.html',
      'zlib.json',
    ]);

    await build();

    expect(await builtFiles()).toEqual(before);
  });

  test('rewrites only the files an edited document is part of', async () => {
    const before = await builtFiles();

    await appendFile(join(input, 'fs.md'), '\nWatches them, too.\n');
    await build();

    const after = await builtFiles();

    expect(changedBetween(before, after)).toEqual([
      'all.html',
      'fs.html',
      'fs.json',
    ]);
    expect(await readFile(join(output, 'fs.html'), 'utf-8')).toContain(
      'Watches them, too.'
    );
  });

  test('removes the files of a deleted document, and nothing the pages need', async () => {
    await writeFile(join(output, 'mine.txt'), 'not doc-kit’s');

    await rm(join(input, 'zlib.md'));
    await build();

    const after = await builtFiles();

    expect(Object.keys(after)).toEqual([
      '404.html',
      'all.html',
      'fs.html',
      'fs.json',
      'path.html',
      'path.json',
    ]);
    await expect(stat(join(output, 'mine.txt'))).resolves.toBeDefined();

    // Every asset a page loads still exists
    for (const page of Object.keys(after).filter(file =>
      file.endsWith('.html')
    )) {
      const html = await readFile(join(output, page), 'utf-8');
      const assets = html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g);

      for (const [, asset] of assets) {
        const path = join(output, dirname(page), asset);

        await expect(
          stat(path),
          `${page} loads ${asset}`
        ).resolves.toBeDefined();
      }
    }
  });
});
