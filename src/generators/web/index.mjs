'use strict';

import { join } from 'node:path';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * Web generator - transforms JSX AST entries into complete web bundles.
 *
 * This generator processes JSX AST entries and produces:
 * - Server-side rendered HTML pages
 * - Client-side JavaScript with code splitting
 * - Bundled CSS styles
 *
 * Note: This generator does NOT support streaming/chunked processing because
 * processJSXEntries needs all entries together to generate code-split bundles.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'web',

  version: '1.0.0',

  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',

  dependsOn: 'jsx-ast',

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.html'),
    title: 'Node.js',
    imports: {
      '#config/Logo': '@node-core/ui-components/Common/NodejsLogo',
    },
  },
});
