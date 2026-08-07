import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { loadManifest, saveManifest } from '../manifest.mjs';
import { CACHE_SCHEMA } from '../salt.mjs';

const createTempDir = () => mkdtemp(join(tmpdir(), 'doc-kit-manifest-test-'));

const PROFILE = {
  completedAt: 1,
  targets: { 'a-target': 'a'.repeat(32) },
  outputs: {},
  complete: true,
};

describe('manifest', () => {
  it('returns a fresh manifest when none exists', async () => {
    const manifest = await loadManifest(await createTempDir());

    assert.deepEqual(manifest, { schema: CACHE_SCHEMA, profiles: {} });
  });

  it('round-trips a profile', async () => {
    const dir = await createTempDir();

    await saveManifest(dir, { key: PROFILE });

    assert.deepEqual((await loadManifest(dir)).profiles.key, PROFILE);
  });

  it('discards a corrupt manifest silently', async () => {
    const dir = await createTempDir();

    await writeFile(join(dir, 'manifest.json'), '{"schema": not json');

    assert.deepEqual(await loadManifest(dir), {
      schema: CACHE_SCHEMA,
      profiles: {},
    });
  });

  it('discards a manifest with a different schema', async () => {
    const dir = await createTempDir();

    await writeFile(
      join(dir, 'manifest.json'),
      JSON.stringify({ schema: -1, profiles: { stale: PROFILE } })
    );

    assert.deepEqual((await loadManifest(dir)).profiles, {});
  });

  it('merges with existing profiles on save', async () => {
    const dir = await createTempDir();

    await saveManifest(dir, { first: PROFILE });
    await saveManifest(dir, { second: { ...PROFILE, completedAt: 2 } });

    const { profiles } = await loadManifest(dir);

    assert.deepEqual(Object.keys(profiles).sort(), ['first', 'second']);
  });
});
