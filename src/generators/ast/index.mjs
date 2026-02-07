'use strict';

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { globSync } from 'tinyglobby';
import { VFile } from 'vfile';

import getConfig from '../../utils/configuration/index.mjs';
import createQueries from '../../utils/queries/index.mjs';
import { getRemark } from '../../utils/remark.mjs';

const { updateStabilityPrefixToLink } = createQueries();
const remarkProcessor = getRemark();

/**
 * This generator parses Markdown API doc files into AST trees.
 * It parallelizes the parsing across worker threads for better performance.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'ast',

  version: '1.0.0',

  description: 'Parses Markdown API doc files into AST trees',

  /**
   * Process a chunk of markdown files in a worker thread.
   * Loads and parses markdown files into AST representations.
   */
  async processChunk(inputSlice, itemIndices) {
    const filePaths = itemIndices.map(idx => inputSlice[idx]);

    const results = [];

    for (const path of filePaths) {
      const vfile = new VFile({ path, value: await readFile(path, 'utf-8') });

      updateStabilityPrefixToLink(vfile);

      results.push({
        tree: remarkProcessor.parse(vfile),
        file: { stem: vfile.stem, basename: vfile.basename },
      });
    }

    return results;
  },

  /**
   * Generates AST trees from markdown input files.
   */
  async *generate(_, worker) {
    const { ast: config } = getConfig();

    const files = globSync(config.input, { ignore: config.ignore }).filter(
      p => extname(p) === '.md'
    );

    // Parse markdown files in parallel using worker threads
    for await (const chunkResult of worker.stream(files, files)) {
      yield chunkResult;
    }
  },
};
