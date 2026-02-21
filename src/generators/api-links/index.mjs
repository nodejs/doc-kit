'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator is responsible for mapping publicly accessible functions in
 * Node.js to their source locations in the Node.js repository.
 *
 * This is a top-level generator. It takes in the raw AST tree of the JavaScript
 * source files. It outputs a `apilinks.json` file into the specified output
 * directory.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'api-links',

  version: '1.0.0',

  description:
    'Creates a mapping of publicly accessible functions to their source locations in the Node.js repository.',

  // Unlike the rest of the generators, this utilizes Javascript sources being
  // passed into the input field rather than Markdown.
  dependsOn: 'ast-js',
});
