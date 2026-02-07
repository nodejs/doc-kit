import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { parse } from 'acorn';
import { globSync } from 'tinyglobby';

import getConfig from '../../utils/configuration/index.mjs';

/**
 * This generator parses Javascript sources passed into the generator's input
 * field. This is separate from the Markdown parsing step since it's not as
 * commonly used and can take up a significant amount of memory.
 *
 * Putting this with the rest of the generators allows it to be lazily loaded
 * so we're only parsing the Javascript sources when we need to.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'ast-js',

  version: '1.0.0',

  description: 'Parses Javascript source files passed into the input.',

  /**
   * Process a chunk of JavaScript files in a worker thread.
   * Parses JS source files into AST representations.
   */
  async processChunk(inputSlice, itemIndices) {
    const filePaths = itemIndices.map(idx => inputSlice[idx]);

    const results = [];

    for (const path of filePaths) {
      const value = await readFile(path, 'utf-8');

      const parsed = parse(value, {
        allowReturnOutsideFunction: true,
        ecmaVersion: 'latest',
        locations: true,
      });

      parsed.path = path;

      results.push(parsed);
    }

    return results;
  },

  /**
   * Generates a JavaScript AST from the input files.
   */
  async *generate(_, worker) {
    const config = getConfig('ast-js');

    const files = globSync(config.input, { ignore: config.ignore }).filter(
      p => extname(p) === '.js'
    );

    // Parse the Javascript sources into ASTs in parallel using worker threads
    // source is both the items list and the fullInput since we use sliceInput
    for await (const chunkResult of worker.stream(files, files)) {
      yield chunkResult;
    }
  },
};
