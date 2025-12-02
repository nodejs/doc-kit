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
   * @param {Input} _
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(_, options) {
    const { loadFiles } = createJsLoader();

    // Load all of the Javascript sources into memory
    const sourceFiles = await loadFiles(options.input ?? []);

    const { parseJsSources } = createJsParser();

    // Parse the Javascript sources into ASTs
    const parsedJsFiles = await parseJsSources(sourceFiles);

    // Return the ASTs so they can be used in another generator
    return parsedJsFiles;
  },
};
