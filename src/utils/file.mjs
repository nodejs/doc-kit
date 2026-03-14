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

/**
 * Kind of like `path.posix.relative`, however, this functions more like a URL resolution
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export const href = (to, from) => {
  if (to.includes('://')) {
    return to;
  }

  const a = to.split('/').filter(Boolean);
  const b = from.split('/').slice(0, -1).filter(Boolean);

  while (a[0] === b[0]) {
    a.shift();
    b.shift();
  }

  return [...b.map(() => '..'), ...a].join('/');
};
