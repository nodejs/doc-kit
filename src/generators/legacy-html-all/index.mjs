'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';
import legacyHtml from '../legacy-html/index.mjs';

/**
 * This generator generates the legacy HTML pages of the legacy API docs
 * for retro-compatibility and while we are implementing the new 'react' and 'html' generators.
 *
 * This generator is a top-level generator, and it takes the raw AST tree of the API doc files
 * and generates the HTML files to the specified output directory from the configuration settings
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'legacy-html-all',

  version: '1.0.0',

  description:
    'Generates the `all.html` file from the `legacy-html` generator, which includes all the modules in one single file',

  dependsOn: 'legacy-html',

  defaultConfiguration: {
    templatePath: legacyHtml.defaultConfiguration.templatePath,
  },
});
