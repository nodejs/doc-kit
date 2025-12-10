'use strict';

import { extname } from 'node:path';

import { globSync } from 'glob';
import { read } from 'to-vfile';

import { getRemark } from '../../utils/remark.mjs';
import createQueries from '../utils/queries/index.mjs';

const { updateStabilityPrefixToLink } = createQueries();
const remarkProcessor = getRemark();

/**
 * This generator parses Markdown API doc files into AST trees.
 * It parallelizes the parsing across worker threads for better performance.
 *
 * @typedef {undefined} Input
 * @typedef {Array<ParserOutput<import('mdast').Root>>} Output
 *
 * @type {GeneratorMetadata<Input, Output>}
 */
export default {
  name: 'ast',

  version: '1.0.0',

  description: 'Parses Markdown API doc files into AST trees',

  /**
   * Process a chunk of markdown files in a worker thread.
   * Loads and parses markdown files into AST representations.
   *
   * @param {string[]} inputSlice - Sliced input paths for this chunk
   * @param {number[]} itemIndices - Indices into the sliced array
   * @returns {Promise<Output>}
   */
  async processChunk(inputSlice, itemIndices) {
    const filePaths = itemIndices.map(idx => inputSlice[idx]);

    return Promise.all(
      filePaths.map(async path => {
        const vfile = await read(path);

        updateStabilityPrefixToLink(vfile);

        return {
          tree: remarkProcessor.parse(vfile),
          file: { stem: vfile.stem, basename: vfile.basename },
        };
      })
    );
  },

  /**
   * Generates AST trees from markdown input files.
   *
   * @param {Input} _ - Unused (top-level generator)
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Output>}
   */
  async *generate(_, { input = [], worker }) {
    const files = globSync(input).filter(path => extname(path) === '.md');

    // Parse markdown files in parallel using worker threads
    for await (const chunkResult of worker.stream(files, files)) {
      yield chunkResult;
    }
  },
};
