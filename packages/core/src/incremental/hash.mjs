'use strict';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { findFiles } from '#utils/glob.mjs';

import { KEY_LENGTH } from './constants.mjs';

/**
 * @param {...(string | Uint8Array)} parts
 * @returns {string} The hex digest, {@link KEY_LENGTH} characters long
 */
export const hash = (...parts) => {
  const hasher = createHash('sha256');

  for (const part of parts) {
    hasher.update(part);
    hasher.update('\0');
  }

  return hasher.digest('hex').slice(0, KEY_LENGTH);
};

/**
 * Hashes every file under a directory, by relative path and content
 *
 * @param {string} directory
 * @returns {Promise<string>}
 */
export const hashDirectory = async directory => {
  const files = findFiles('**/*', { cwd: directory }).sort();

  const parts = [];

  for (const file of files) {
    parts.push(file, await readFile(join(directory, file)));
  }

  return hash(...parts);
};
