'use strict';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CACHE_SCHEMA } from './salt.mjs';

const MANIFEST = 'manifest.json';

/**
 * Loads the cache manifest. Any parse or schema mismatch discards it
 * wholesale — objects are self-keyed, so a lost manifest only costs the
 * whole-skip records, never correctness.
 *
 * @param {string} dir - Cache directory
 * @returns {Promise<import('./types').Manifest>}
 */
export const loadManifest = async dir => {
  try {
    const manifest = JSON.parse(await readFile(join(dir, MANIFEST), 'utf-8'));

    if (manifest.schema === CACHE_SCHEMA) {
      return manifest;
    }
  } catch {
    // Fall through to a fresh manifest.
  }

  return { schema: CACHE_SCHEMA, profiles: {} };
};

/**
 * Saves the manifest with a read-merge-write cycle: the on-disk manifest is
 * re-read so a concurrent process's profiles survive, then the given profiles
 * are merged in and the result written atomically (temp + rename).
 *
 * @param {string} dir - Cache directory
 * @param {Record<string, import('./types').Profile>} profiles - Profiles to merge in
 * @returns {Promise<void>}
 */
export const saveManifest = async (dir, profiles) => {
  const manifest = await loadManifest(dir);

  Object.assign(manifest.profiles, profiles);

  const tmp = join(dir, `${MANIFEST}.${process.pid}.tmp`);

  await mkdir(dir, { recursive: true });
  await writeFile(tmp, JSON.stringify(manifest));
  await rename(tmp, join(dir, MANIFEST));
};
