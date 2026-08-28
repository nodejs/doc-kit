'use strict';

import { slug } from 'github-slugger';

import { SAFE_FILE_NAME } from '../constants.mjs';

/**
 * Derives a chunk's file name (without extension) from its heading.
 *
 * API names keep their case so `fs.readFile()` lands at `fs/readFile.html`,
 * with the module's own prefix dropped. Prose headings, and any API name that
 * would not make a clean file name, are slugged instead (`Callback API`
 * becomes `callback-api`).
 *
 * @param {string} label - The chunk's display label
 * @param {import('@doc-kit/core/generators/metadata/types').HeadingData} heading - The chunk's heading data
 * @param {string} api - The module's API name (e.g. `fs`)
 * @returns {string}
 */
export const toFileName = (label, heading, api) => {
  let name = label.replace(/^new\s+/, '');

  if (name.startsWith(`${api}.`)) {
    name = name.slice(api.length + 1);
  }

  name = name.replace(/["']/g, '');

  return heading.type && SAFE_FILE_NAME.test(name) ? name : slug(name);
};

/**
 * Creates a function that makes file names unique within one module.
 * Comparison is case-insensitive so the output is safe on case-insensitive
 * file systems; a repeated name gets a numeric suffix (`close`, `close-2`).
 *
 * @returns {(name: string) => string}
 */
export const createUniqueNamer = () => {
  const used = new Map();

  return name => {
    const key = name.toLowerCase();
    const count = (used.get(key) ?? 0) + 1;

    used.set(key, count);

    return count === 1 ? name : `${name}-${count}`;
  };
};
