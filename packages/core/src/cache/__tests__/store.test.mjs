import assert from 'node:assert/strict';
import { mkdtemp, readdir, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { createStore } from '../store.mjs';

const KEY_A = 'a'.repeat(32);
const KEY_B = 'b'.repeat(32);

const createTempStore = async () =>
  createStore(await mkdtemp(join(tmpdir(), 'doc-kit-store-test-')));

describe('store', () => {
  it('round-trips a value', async () => {
    const store = await createTempStore();

    store.put(KEY_A, 'value');
    await store.flush();

    assert.equal(await store.get(KEY_A), 'value');
  });

  it('misses on unknown keys', async () => {
    const store = await createTempStore();

    assert.equal(await store.get(KEY_A), null);
    assert.equal(store.stats.misses, 1);
  });

  it('counts hits and writes', async () => {
    const store = await createTempStore();

    store.put(KEY_A, 'value');
    await store.flush();
    await store.get(KEY_A);

    assert.equal(store.stats.hits, 1);
    assert.equal(store.stats.writes, 1);
  });

  it('memoizes: computes once, then serves from disk', async () => {
    const store = await createTempStore();

    let calls = 0;
    const produce = () => {
      calls++;

      return 'computed';
    };

    assert.equal(await store.memo('ns', KEY_A, produce), 'computed');
    await store.flush();
    assert.equal(await store.memo('ns', KEY_A, produce), 'computed');
    assert.equal(calls, 1);
  });

  it('namespaces memo values', async () => {
    const store = await createTempStore();

    await store.memo('one', KEY_A, () => 'first');
    await store.flush();

    assert.equal(await store.memo('two', KEY_A, () => 'second'), 'second');
  });

  it('prunes objects older than the age threshold', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'doc-kit-store-test-'));
    const store = createStore(dir);

    store.put(KEY_A, 'old');
    store.put(KEY_B, 'fresh');
    await store.flush();

    const oldPath = join(dir, 'objects', KEY_A.slice(0, 2), KEY_A);
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await utimes(oldPath, past, past);

    await store.prune(7);

    assert.equal(await store.get(KEY_A), null);
    assert.equal(await store.get(KEY_B), 'fresh');
  });

  it('writes atomically: no partial objects are left behind', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'doc-kit-store-test-'));
    const store = createStore(dir);

    store.put(KEY_A, 'value');
    await store.flush();

    const shard = await readdir(join(dir, 'objects', KEY_A.slice(0, 2)));

    assert.deepEqual(shard, [KEY_A]);
  });

  it('swallows write failures', async () => {
    // A file where the objects dir should be makes every write fail.
    const dir = await mkdtemp(join(tmpdir(), 'doc-kit-store-test-'));
    await writeFile(join(dir, 'objects'), 'not a directory');

    const store = createStore(dir);

    store.put(KEY_A, 'value');

    await assert.doesNotReject(store.flush());
  });
});
