'use strict';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { isPlainObject } from '#utils/misc.mjs';

import { MANIFEST_FILE, SCHEMA, STATE_DIRECTORY } from './constants.mjs';

// Files from an interrupted build are listed under this key. No item hashes
// to it, so they can be removed but never reused
const UNKNOWN_KEY = '';

/**
 * @param {string} output
 * @returns {string}
 */
export const manifestPath = output =>
  join(resolve(output), STATE_DIRECTORY, MANIFEST_FILE);

/**
 * Whether a recorded file is inside the output directory. Files listed in the
 * manifest can be deleted, so it must not list anything else.
 *
 * @param {string} output
 * @param {unknown} file
 * @returns {boolean}
 */
const isInside = (output, file) => {
  if (typeof file !== 'string') {
    return false;
  }

  const path = relative(output, resolve(output, file));

  return path !== '' && !isAbsolute(path) && path.split(sep)[0] !== '..';
};

/**
 * @param {string} output
 * @param {unknown} manifest
 * @returns {string | undefined} Why the manifest cannot be used
 */
const validate = (output, manifest) => {
  if (manifest?.schema !== SCHEMA) {
    return `has schema ${manifest?.schema}, expected ${SCHEMA}`;
  }

  const wellFormed =
    isPlainObject(manifest.generators) &&
    Object.values(manifest.generators).every(
      outputs =>
        isPlainObject(outputs) &&
        Object.values(outputs).every(
          files =>
            Array.isArray(files) && files.every(file => isInside(output, file))
        )
    );

  return wellFormed ? undefined : 'is malformed';
};

/**
 * Reads a manifest. An unusable one is returned empty, with a `reason`. One
 * from an interrupted build keeps its files, so they can be removed, but not
 * their keys.
 *
 * @param {string} output
 * @returns {Promise<{ manifest: import('./types').Manifest, reason?: string }>}
 */
export const loadManifest = async output => {
  const path = manifestPath(output);
  const empty = { schema: SCHEMA, generators: {} };

  let manifest;

  try {
    manifest = JSON.parse(await readFile(path, 'utf-8'));
  } catch (error) {
    return {
      manifest: empty,
      reason:
        error.code === 'ENOENT'
          ? `no manifest at ${path}`
          : `${path} cannot be read (${error.message})`,
    };
  }

  const invalid = validate(resolve(output), manifest);

  if (invalid) {
    return { manifest: empty, reason: `${path} ${invalid}` };
  }

  if (manifest.building) {
    const generators = Object.fromEntries(
      Object.entries(manifest.generators).map(([name, outputs]) => [
        name,
        { [UNKNOWN_KEY]: Object.values(outputs).flat() },
      ])
    );

    return {
      manifest: { schema: SCHEMA, generators },
      reason: `${path} is from a build that did not finish`,
    };
  }

  return { manifest };
};

/**
 * Writes a manifest atomically: to a temporary file, flushed, then renamed.
 *
 * @param {string} output
 * @param {import('./types').Manifest} manifest
 */
export const saveManifest = async (output, manifest) => {
  const path = manifestPath(output);
  const temporary = `${path}.tmp`;

  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, JSON.stringify(manifest, null, 2), {
    flush: true,
  });
  await rename(temporary, path);
};
