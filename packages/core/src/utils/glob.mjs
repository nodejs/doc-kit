import { globSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// A path segment holding any glob syntax (wildcards, classes, braces or extglobs)
const GLOB_SEGMENT = /[*?[{]|[!+@]\(/;

/**
 * Finds the files matching glob patterns, as POSIX paths relative to `cwd`
 * (absolute patterns included). Directories are left out.
 *
 * @param {string | string[]} patterns - Glob patterns to match
 * @param {{ cwd?: string | URL, ignore?: string[] }} [options]
 * @returns {string[]}
 */
export const findFiles = (patterns, { cwd = process.cwd(), ignore } = {}) => {
  const root = cwd instanceof URL ? fileURLToPath(cwd) : cwd;

  return globSync(patterns, { cwd: root, exclude: ignore, withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent =>
      relative(root, resolve(root, dirent.parentPath, dirent.name))
        .split(sep)
        .join('/')
    );
};

/**
 * Returns the directory part of a glob pattern before its first glob segment,
 * e.g. `doc/api` for `doc/api/*.md`, or the parent directory of a plain path.
 *
 * @param {string} pattern - A glob pattern with POSIX separators
 * @returns {string}
 */
export const globParent = pattern => {
  const segments = pattern.split('/');
  const index = segments.findIndex(segment => GLOB_SEGMENT.test(segment));
  const parent = segments.slice(0, index === -1 ? -1 : index).join('/');

  return parent || (pattern.startsWith('/') ? '/' : '.');
};
