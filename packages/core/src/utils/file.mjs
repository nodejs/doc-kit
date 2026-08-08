import fs from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import { getBuildCache } from '../cache/index.mjs';

/**
 * Returns the input string with the `ext` extension, replacing any pre-existing extension
 * @param {string} str
 * @param {string} ext
 */
export const withExt = (str, ext) =>
  `${str.replace(/\.[0-9a-z]+$/i, '')}${ext ? `.${ext}` : ''}`;

/**
 * Writes a file, recursively. When a build cache is active, the write is
 * recorded for output verification and skipped when byte-identical.
 *
 * @type {typeof fs.writeFile}
 */
export const writeFile = (file, ...args) => {
  const cache = getBuildCache();

  if (cache) {
    return cache.writeTracked(file, args[0], args.slice(1));
  }

  return fs
    .mkdir(dirname(file), { recursive: true })
    .then(() => fs.writeFile(file, ...args));
};

/**
 * Copies a file or directory recursively, recording every copied file with
 * the build cache (when active) so copied assets participate in output
 * verification.
 *
 * @param {string} src - Source file or directory
 * @param {string} dest - Destination path
 * @returns {Promise<void>}
 */
export const copyPath = async (src, dest) => {
  await fs.cp(src, dest, { recursive: true, force: true });

  const cache = getBuildCache();

  if (!cache) {
    return;
  }

  if ((await fs.stat(src)).isFile()) {
    return cache.recordOutput(dest, await fs.readFile(dest));
  }

  for await (const entry of fs.glob('**/*', {
    cwd: src,
    withFileTypes: true,
  })) {
    if (entry.isFile()) {
      const rel = relative(src, join(entry.parentPath, entry.name));

      cache.recordOutput(join(dest, rel), await fs.readFile(join(dest, rel)));
    }
  }
};
