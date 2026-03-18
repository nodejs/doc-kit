'use strict';

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { globSync } from 'tinyglobby';
import { VFile } from 'vfile';

import { STABILITY_INDEX_URL } from './constants.mjs';
import getConfig from '../../utils/configuration/index.mjs';
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

  for (const path of filePaths) {
    try {
      const content = await readFile(path, 'utf-8');
      const vfile = new VFile({
        path,
        value: content.replace(
          QUERIES.stabilityIndexPrefix,
          match => `[${match}](${STABILITY_INDEX_URL})`
        ),
      });

      results.push({
        tree: remarkProcessor.parse(vfile),
        file: { stem: vfile.stem, basename: vfile.basename, path },
      });
    } catch (err) {
      const message = `Failed to process ${path}: ${err.message ?? err}`;
      throw new Error(message, { cause: err });
    }
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

  const files = globSync(config.input, { ignore: config.ignore }).filter(
    p => extname(p) === '.md'
  );

  // Parse markdown files in parallel using worker threads
  for await (const chunkResult of worker.stream(files)) {
    yield chunkResult;
  }
}
