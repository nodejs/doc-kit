'use strict';

import assert from 'node:assert/strict';
import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { hash, hashDirectory, trace } from '../hash.mjs';

describe('hash', () => {
  it('gives a different hash when the same text is split differently', () => {
    assert.notEqual(hash('ab', 'c'), hash('a', 'bc'));
    assert.equal(hash('ab', 'c'), hash('ab', 'c'));
  });

  it('hashes bytes as they are, and other values as JSON', () => {
    assert.equal(hash(Buffer.from('a')), hash('a'));
    assert.equal(hash({ a: [1] }), hash('{"a":[1]}'));
    assert.notEqual(hash({ a: 1 }), hash({ a: 2 }));
  });

  it('hashes a stored result, and the elements of a stored array, by key', () => {
    const result = { content: 'a' };
    const list = [{ content: 'b' }];

    trace(result, 'key');
    trace(list, 'list');

    assert.equal(hash(result), hash('"key"'));
    assert.equal(hash({ page: result }), hash('{"page":"key"}'));
    assert.equal(hash(list[0]), hash('"list/0"'));

    // A copy is not the stored result
    assert.notEqual(hash({ ...result }), hash(result));
  });
});

describe('hashDirectory', () => {
  it('depends on every path and byte', async () => {
    await using directory = await mkdtempDisposable(
      join(tmpdir(), 'doc-kit-hash-')
    );

    const { path } = directory;

    await mkdir(join(path, 'assets'));
    await writeFile(join(path, 'library.mjs'), 'export {}');
    await writeFile(join(path, 'assets/chunk.mjs'), 'a');

    const first = await hashDirectory(path);

    assert.equal(await hashDirectory(path), first);

    await writeFile(join(path, 'assets/chunk.mjs'), 'b');
    assert.notEqual(await hashDirectory(path), first);

    await writeFile(join(path, 'assets/chunk.mjs'), 'a');
    await writeFile(join(path, 'assets/other.mjs'), '');
    assert.notEqual(await hashDirectory(path), first);
  });
});
