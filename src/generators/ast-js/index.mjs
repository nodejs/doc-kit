import { extname } from 'node:path';

import { globSync } from 'glob';
import { read } from 'to-vfile';

import { parseJsSource } from '../../parsers/javascript.mjs';

/**
 * This generator parses Javascript sources passed into the generator's input
 * field. This is separate from the Markdown parsing step since it's not as
 * commonly used and can take up a significant amount of memory.
 *
 * Putting this with the rest of the generators allows it to be lazily loaded
 * so we're only parsing the Javascript sources when we need to.
 *
 * @typedef {unknown} Input
 * @typedef {Array<JsProgram>} Output
 *
 * @type {GeneratorMetadata<Input, Output>}
 */
export default {
  name: 'ast-js',

  version: '1.0.0',

  description: 'Parses Javascript source files passed into the input.',

  /**
   * Process a chunk of JavaScript files in a worker thread.
   * Parses JS source files into AST representations.
   *
   * @param {string[]} inputSlice - Sliced input paths for this chunk
   * @param {number[]} itemIndices - Indices into the sliced array
   * @returns {Promise<Output>} Parsed JS AST objects for each file
   */
  async processChunk(inputSlice, itemIndices) {
    const filePaths = itemIndices.map(idx => inputSlice[idx]);

    const results = [];

    for (const path of filePaths) {
      const vfile = await read(path, 'utf-8');

      const parsedJS = await parseJsSource(vfile);

      results.push(parsedJS);
    }

    return results;
  },

  /**
   * Generates a JavaScript AST from the input files.
   *
   * @param {Input} _ - Unused (files loaded from input paths)
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Output>}
   */
  async *generate(_, { input = [], ignore, worker }) {
    const toIgnore = globSync(ignore);

    const files = globSync(input)
      .filter(path => extname(path) === '.js')
      .filter(path => !toIgnore.includes(path));

    // Parse the Javascript sources into ASTs in parallel using worker threads
    // source is both the items list and the fullInput since we use sliceInput
    for await (const chunkResult of worker.stream(files, files)) {
      yield chunkResult;
    }
  },
};
