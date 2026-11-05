'use strict';

import { rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { readJSON, writeJSON } from '#utils/file.mjs';

import { MANIFEST_DIRECTORY, MANIFEST_FILE, SCHEMA } from './constants.mjs';

/**
 * @param {string} output
 * @returns {string}
 */
export const manifestPath = output =>
  join(resolve(output), MANIFEST_DIRECTORY, MANIFEST_FILE);

/**
 * Reads a manifest; an unusable one is empty, with the `reason`
 *
 * @param {string} output
 * @returns {Promise<{ manifest: import('./types').Manifest, reason?: string }>}
 */
export const loadManifest = async output => {
  const path = manifestPath(output);
  const empty = { schema: SCHEMA, generators: {} };

  let manifest;

  try {
    manifest = await readJSON(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { manifest: empty, reason: `no manifest at ${path}` };
    }

    if (error instanceof SyntaxError) {
      return { manifest: empty, reason: `${path} is not valid JSON` };
    }

    throw error;
  }

  if (manifest.schema !== SCHEMA) {
    return {
      manifest: empty,
      reason: `${path} has schema ${manifest.schema}, expected ${SCHEMA}`,
    };
  }

  return { manifest };
};

/**
 * Writes a manifest atomically
 *
 * @param {string} output
 * @param {import('./types').Manifest} manifest
 */
export const saveManifest = async (output, manifest) => {
  const path = manifestPath(output);
  const temporary = `${path}.tmp`;

  await writeJSON(temporary, manifest);
  await rename(temporary, path);
};
