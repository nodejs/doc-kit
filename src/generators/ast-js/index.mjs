import { extname } from 'node:path';

import { globSync } from 'glob';

import createJsLoader from '../../loaders/javascript.mjs';
import createJsParser from '../../parsers/javascript.mjs';

/**
 * This generator parses Javascript sources passed into the generator's input
 * field. This is separate from the Markdown parsing step since it's not as
 * commonly used and can take up a significant amount of memory.
 *
 * Putting this with the rest of the generators allows it to be lazily loaded
 * so we're only parsing the Javascript sources when we need to.
 *
 * @typedef {unknown} Input
 *
 * @type {GeneratorMetadata<Input, Array<JsProgram>>}
 */
export default {
  name: 'ast-js',

  version: '1.0.0',

  description: 'Parses Javascript source files passed into the input.',

  dependsOn: 'metadata',

  /**
   * Process a chunk of JavaScript files in a worker thread.
   * @param {unknown} _
   * @param {number[]} itemIndices
   * @param {Partial<GeneratorOptions>} options
   */
  async processChunk(_, itemIndices, { input }) {
    const { loadFiles } = createJsLoader();
    const { parseJsSource } = createJsParser();

    const results = [];

    for (const idx of itemIndices) {
      const [file] = loadFiles(input[idx]);

      const parsedFile = await parseJsSource(file);

      results.push(parsedFile);
    }

    return results;
  },

  /**
   * @param {Input} i
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Array<object>>}
   */
  async *generate(i, { input = [], worker }) {
    const sourceFiles = globSync(input).filter(
      filePath => extname(filePath) === '.js'
    );

    const deps = { input: sourceFiles };

    // Parse the Javascript sources into ASTs in parallel using worker threads
    for await (const chunkResult of worker.stream(sourceFiles, i, deps)) {
      yield chunkResult;
    }
  },
};
