'use strict';

import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';

import globParent from 'glob-parent';
import { globSync } from 'tinyglobby';

import { hashData } from './hash.mjs';

/**
 * Globs and content-hashes a root generator's input files. The digest covers
 * the file set and every file's bytes, with paths relative to each pattern's
 * glob parent so a relocated checkout produces the same digest.
 *
 * @param {string[]} patterns - Input glob patterns (as `ast`/`ast-js` consume them)
 * @param {string[]} [ignore] - Ignore patterns
 * @returns {Promise<import('./types').Snapshot>}
 */
export const createSnapshot = async (patterns, ignore) => {
  const files = patterns.flatMap(pattern => {
    const parent = globParent(pattern);

    return globSync(pattern, { ignore }).map(abs => ({
      abs,
      rel: relative(parent, abs),
    }));
  });

  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

  await Promise.all(
    files.map(async file => {
      file.hash = hashData(await readFile(file.abs));
    })
  );

  const digest = hashData(
    files.map(file => `${file.rel}:${file.hash}`).join('\n')
  );

  return { files, digest };
};
