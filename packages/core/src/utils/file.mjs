import fs from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Returns the input string with the `ext` extension, replacing any pre-existing extension
 * @param {string} str
 * @param {string} ext
 */
export const withExt = (str, ext) =>
  `${str.replace(/\.[0-9a-z]+$/i, '')}${ext ? `.${ext}` : ''}`;

/**
 * Writes a file, recursively
 *
 * @type {typeof fs.writeFile}
 */
export const writeFile = (file, ...args) =>
  fs
    .mkdir(dirname(file), { recursive: true })
    .then(() => fs.writeFile(file, ...args));
