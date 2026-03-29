'use strict';

import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path/posix';

import globParent from 'glob-parent';
import { globSync } from 'tinyglobby';

import { STABILITY_INDEX_URL } from './constants.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { withExt } from '../../utils/file.mjs';
import { QUERIES } from '../../utils/queries/index.mjs';
import { getRemark } from '../../utils/remark.mjs';

const remarkProcessor = getRemark();

/**
 * Process a chunk of markdown files in a worker thread.
 * Loads and parses markdown files into AST representations.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(inputSlice, itemIndices) {
  const filePaths = itemIndices.map(idx => inputSlice[idx]);

  const results = [];

  for (const [path, parent] of filePaths) {
    const content = await readFile(path, 'utf-8');
    const value = content.replace(
      QUERIES.stabilityIndexPrefix,
      match => `[${match}](${STABILITY_INDEX_URL})`
    );

    const relativePath = sep + withExt(relative(parent, path));

    results.push({
      tree: remarkProcessor.parse(value),
      // The path is the relative path minus the extension
      path: relativePath,
    });
  }

  return results;
}

/**
 * Generates AST trees from markdown input files.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(_, worker) {
  const { ast: config } = getConfig();

  const files = config.input.flatMap(input => {
    const parent = globParent(input);

    return globSync(input, { ignore: config.ignore }).map(child => [
      child,
      parent,
    ]);
  });

  // Parse markdown files in parallel using worker threads
  for await (const chunkResult of worker.stream(files)) {
    yield chunkResult;
  }
}
