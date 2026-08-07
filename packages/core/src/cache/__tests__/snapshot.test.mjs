import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { createSnapshot } from '../snapshot.mjs';

const createFixtureDir = async files => {
  const dir = await mkdtemp(join(tmpdir(), 'doc-kit-snapshot-test-'));

  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }

  return dir;
};

describe('createSnapshot', () => {
  it('lists files sorted with content hashes', async () => {
    const dir = await createFixtureDir({ 'b.md': 'bee', 'a.md': 'ay' });

    const snapshot = await createSnapshot([join(dir, '*.md')]);

    assert.deepEqual(
      snapshot.files.map(file => file.rel),
      ['a.md', 'b.md']
    );
    assert.ok(snapshot.files.every(file => /^[0-9a-f]{32}$/.test(file.hash)));
  });

  it('changes the digest when content changes', async () => {
    const dir = await createFixtureDir({ 'a.md': 'one' });
    const before = await createSnapshot([join(dir, '*.md')]);

    await writeFile(join(dir, 'a.md'), 'two');
    const after = await createSnapshot([join(dir, '*.md')]);

    assert.notEqual(before.digest, after.digest);
  });

  it('changes the digest when a file is added', async () => {
    const dir = await createFixtureDir({ 'a.md': 'one' });
    const before = await createSnapshot([join(dir, '*.md')]);

    await writeFile(join(dir, 'b.md'), 'two');
    const after = await createSnapshot([join(dir, '*.md')]);

    assert.notEqual(before.digest, after.digest);
  });

  it('is stable across identical content in different directories', async () => {
    const dirA = await createFixtureDir({ 'a.md': 'same' });
    const dirB = await createFixtureDir({ 'a.md': 'same' });

    const [snapA, snapB] = await Promise.all([
      createSnapshot([join(dirA, '*.md')]),
      createSnapshot([join(dirB, '*.md')]),
    ]);

    // Paths are glob-parent relative, so a relocated checkout hits.
    assert.equal(snapA.digest, snapB.digest);
  });

  it('respects ignore patterns', async () => {
    const dir = await createFixtureDir({ 'a.md': 'keep', 'skip.md': 'skip' });

    const snapshot = await createSnapshot(
      [join(dir, '*.md')],
      [join(dir, 'skip.md')]
    );

    assert.deepEqual(
      snapshot.files.map(file => file.rel),
      ['a.md']
    );
  });
});
