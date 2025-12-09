'use strict';

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { globSync } from 'glob';
import { VFile } from 'vfile';

import createQueries from '../../utils/queries/index.mjs';
import { getRemark } from '../../utils/remark.mjs';

const remarkProcessor = getRemark();

const { updateStabilityPrefixToLink } = createQueries();

/**
 * Parses a single markdown file into an AST.
 *
 * @param {string} filePath - Path to the markdown file
 * @returns {Promise<ParserOutput<import('mdast').Root>>}
 */
const parseMarkdownFile = async filePath => {
  const fileContents = await readFile(filePath, 'utf-8');
  const vfile = new VFile({ path: filePath, value: fileContents });

  // Normalizes all the Stability Index prefixes with Markdown links
  updateStabilityPrefixToLink(vfile);

  // Parses the API doc into an AST tree using `unified` and `remark`
  const tree = remarkProcessor.parse(vfile);

  return { file: { stem: vfile.stem, basename: vfile.basename }, tree };
};

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

  dependsOn: undefined,

  processChunk: Object.assign(
    /**
     * Process a chunk of markdown files in a worker thread.
     * Loads and parses markdown files into AST representations.
     *
     * @param {string[]} inputSlice - Sliced input paths for this chunk
     * @param {number[]} itemIndices - Indices into the sliced array
     * @returns {Promise<Array<ParserOutput<import('mdast').Root>>>}
     */
    async (inputSlice, itemIndices) => {
      const results = [];

      for (const idx of itemIndices) {
        const parsed = await parseMarkdownFile(inputSlice[idx]);

        results.push(parsed);
      }

      return results;
    },
    { sliceInput: true }
  ),

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
