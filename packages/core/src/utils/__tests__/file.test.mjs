'use strict';

import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { setConfig } from '../configuration/index.mjs';
import { withExt, writeFile } from '../file.mjs';

describe('withExt', () => {
  it('should replace an existing extension', () => {
    assert.strictEqual(withExt('file.md', 'html'), 'file.html');
    assert.strictEqual(withExt('path/to/file.md', 'json'), 'path/to/file.json');
  });

  it('should add an extension when there is none', () => {
    assert.strictEqual(withExt('file', 'html'), 'file.html');
  });

  it('should strip the extension when ext is empty', () => {
    assert.strictEqual(withExt('file.md', ''), 'file');
    assert.strictEqual(withExt('file.md'), 'file');
  });

  it('should handle files with multiple dots', () => {
    assert.strictEqual(withExt('file.test.mjs', 'js'), 'file.test.js');
  });
});

describe('writeFile', () => {
  const createFile = async context => {
    const directory = await mkdtemp(join(tmpdir(), 'doc-kit-file-'));
    context.after(() => rm(directory, { recursive: true, force: true }));

    return join(directory, 'nested', 'file.txt');
  };

  it('leaves identical bytes alone in an incremental build only', async context => {
    const file = await createFile(context);
    await setConfig({ experimentalIncremental: true });
    context.after(() => setConfig({}));

    await writeFile(file, 'content');
    const { mtimeMs } = await stat(file);

    // Let the clock move, so an unchanged mtime means no write happened
    await setTimeout(20);

    await writeFile(file, Buffer.from('content'));
    assert.equal((await stat(file)).mtimeMs, mtimeMs);

    await setConfig({});
    await setTimeout(20);
    await writeFile(file, '"content"');
    assert.notEqual((await stat(file)).mtimeMs, mtimeMs);
  });
});
