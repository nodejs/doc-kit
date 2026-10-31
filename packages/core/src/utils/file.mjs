import fs from 'node:fs/promises';
import { dirname } from 'node:path';

import getConfig from '#utils/configuration/index.mjs';

/**
 * Returns the input string with the `ext` extension, replacing any pre-existing extension
 * @param {string} str
 * @param {string} ext
 */
export const withExt = (str, ext) =>
  `${str.replace(/\.[0-9a-z]+$/i, '')}${ext ? `.${ext}` : ''}`;

/**
 * @param {string} file
 * @param {string | Uint8Array} data
 */
const holds = async (file, data) => {
  try {
    return (await fs.readFile(file)).equals(Buffer.from(data));
  } catch {
    return false;
  }
};

/**
 * Writes a file, recursively. An incremental build leaves a file holding the
 * same bytes alone.
 *
 * @type {typeof fs.writeFile}
 */
export const writeFile = async (file, data, ...args) => {
  if (getConfig()?.experimentalIncremental && (await holds(file, data))) {
    return;
  }

  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, data, ...args);
};

/**
 * @param {string} file
 * @returns {Promise<any>}
 */
export const readJSON = async file =>
  JSON.parse(await fs.readFile(file, 'utf-8'));

/**
 * Writes a value as JSON
 *
 * @param {string} file
 * @param {unknown} value
 * @param {boolean} [minify]
 */
export const writeJSON = (file, value, minify = false) =>
  writeFile(file, JSON.stringify(value, null, minify ? 0 : 2));
