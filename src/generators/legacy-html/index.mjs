'use strict';

import { join } from 'node:path';

import { GITHUB_EDIT_URL } from '../../utils/configuration/templates.mjs';
import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 *
 * This generator generates the legacy HTML pages of the legacy API docs
 * for retro-compatibility and while we are implementing the new 'react' and 'html' generators.
 *
 * This generator is a top-level generator, and it takes the raw AST tree of the API doc files
 * and generates the HTML files to the specified output directory from the configuration settings
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'legacy-html',

  version: '1.0.0',

  description:
    'Generates the legacy version of the API docs in HTML, with the assets and styles included as files',

  dependsOn: 'metadata',

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.html'),
    additionalPathsToCopy: [join(import.meta.dirname, 'assets')],
    ref: 'main',
    pageURL: '{baseURL}/latest-{version}/api{path}.html',
    editURL: `${GITHUB_EDIT_URL}/doc/api{path}.md`,
  },

  hasParallelProcessor: true,
});
