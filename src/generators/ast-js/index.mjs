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
   * Called by chunk-worker.mjs for parallel processing.
   *
   * @param {unknown} _ - Unused (we use options.input instead)
   * @param {number[]} itemIndices - Indices of source files to process
   * @param {Partial<GeneratorOptions>} options
   */
  async processChunk(_, itemIndices, { input }) {
    const { loadFiles } = createJsLoader();

    const sourceFiles = loadFiles(input ?? []);

    const { parseJsSource } = createJsParser();

    const results = [];

    for (const idx of itemIndices) {
      results.push(await parseJsSource(sourceFiles[idx]));
    }

    return results;
  },

  /**
   * @param {Input} _
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(_, { input, worker }) {
    const { loadFiles } = createJsLoader();

    // Load all of the Javascript sources into memory
    const sourceFiles = loadFiles(input ?? []);

    // Parse the Javascript sources into ASTs in parallel using worker threads
    // Note: We pass sourceFiles as items but _ (empty) as fullInput since
    // processChunk reloads files from options.input
    return worker.map(sourceFiles, _, { input });
  },
};
