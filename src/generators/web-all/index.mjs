'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';
import web from '../web/index.mjs';

/**
 * Web "all" generator - produces a single `all.html` page that contains every
 * API documentation module rendered into one combined web bundle.
 *
 * Mirrors the role of `legacy-html-all` for the new `web` generator. Useful
 * for offline browsing and for reading the full documentation in environments
 * where JavaScript is unavailable, since the `web` searchbar requires JS.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'web-all',

  version: '1.0.0',

  description:
    'Generates the `all.html` file from the `web` generator, which includes all the modules in one single file',

  dependsOn: 'metadata',

  defaultConfiguration: {
    templatePath: web.defaultConfiguration.templatePath,
  },
});
