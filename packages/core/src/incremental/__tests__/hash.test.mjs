'use strict';

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { hash, hashDirectory } from '../hash.mjs';

describe('hash', () => {
  it('terminates each part, so splitting differently gives another hash', () => {
    assert.notEqual(hash('ab', 'c'), hash('a', 'bc'));
    assert.equal(hash('ab', 'c'), hash('ab', 'c'));
  });
});

describe('hashDirectory', () => {
  it('depends on every path and byte, not on read order', async context => {
    const directory = await mkdtemp(join(tmpdir(), 'doc-kit-hash-'));
    context.after(() => rm(directory, { recursive: true, force: true }));

    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'library.mjs'), 'export {}');
    await writeFile(join(directory, 'assets/chunk.mjs'), 'a');

    const first = await hashDirectory(directory);

    assert.equal(await hashDirectory(directory), first);

    await writeFile(join(directory, 'assets/chunk.mjs'), 'b');
    assert.notEqual(await hashDirectory(directory), first);

    await writeFile(join(directory, 'assets/chunk.mjs'), 'a');
    await writeFile(join(directory, 'assets/other.mjs'), '');
    assert.notEqual(await hashDirectory(directory), first);
  });
});
