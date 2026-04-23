'use strict';

import { GITHUB_EDIT_URL } from '../../utils/configuration/templates.mjs';
import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * Generator for converting MDAST to JSX AST.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'jsx-ast',

  version: '1.0.0',

  description: 'Generates JSX AST from the input MDAST',

  dependsOn: 'metadata',

  defaultConfiguration: {
    ref: 'main',
    pageURL: '{baseURL}/latest-{version}/api{path}.html',
    editURL: `${GITHUB_EDIT_URL}/doc/api{path}.md`,
  },

  hasParallelProcessor: true,
});
