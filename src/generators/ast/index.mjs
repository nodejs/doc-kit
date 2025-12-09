'use strict';

import { extname } from 'node:path';

import { globSync } from 'glob';

import createLoader from '../../loaders/markdown.mjs';
import { getRemark } from '../../utils/remark.mjs';

const { loadFiles } = createLoader();

const remarkProcessor = getRemark();

/**
 * This generator parses Markdown API doc files into AST trees.
 * It parallelizes the parsing across worker threads for better performance.
 *
 * @typedef {undefined} Input
 *
 * @type {GeneratorMetadata<Input, Array<ParserOutput<import('mdast').Root>>>}
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
   * @returns {Promise<Array<ParserOutput<import('mdast').Root>>>}
   */
  async processChunk(inputSlice, itemIndices) {
    const filePaths = itemIndices.map(idx => inputSlice[idx]);

    const vfiles = await Promise.all(loadFiles(filePaths));

    return vfiles.map(vfile => {
      const tree = remarkProcessor.parse(vfile);

      const minimalVfile = { stem: vfile.stem, basename: vfile.basename };

      return { file: minimalVfile, tree };
    });
  },

  /**
   * Generates AST trees from markdown input files.
   *
   * @param {Input} _ - Unused (top-level generator)
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Array<ParserOutput<import('mdast').Root>>>}
   */
  async *generate(_, { input = [], worker }) {
    const files = globSync(input).filter(path => extname(path) === '.md');

    // Parse markdown files in parallel using worker threads
    for await (const chunkResult of worker.stream(files, files)) {
      yield chunkResult;
    }
  },
};
