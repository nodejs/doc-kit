'use strict';

import { join } from 'node:path';

import { GITHUB_EDIT_URL } from '../../utils/configuration/templates.mjs';
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
    project: 'Node.js',
    title: '{project} {version} Documentation',
    useAbsoluteURLs: false,
    editURL: `${GITHUB_EDIT_URL}/doc/api{path}.md`,
    pageURL: '{baseURL}/latest-{version}/api{path}.html',
    imports: {
      '#theme/Logo': '@node-core/ui-components/Common/NodejsLogo',
      '#theme/Navigation': join(import.meta.dirname, './ui/components/NavBar'),
      '#theme/Sidebar': join(import.meta.dirname, './ui/components/SideBar'),
      '#theme/Metabar': join(import.meta.dirname, './ui/components/MetaBar'),
      '#theme/Footer': join(import.meta.dirname, './ui/components/NoOp'),
      '#theme/Layout': join(import.meta.dirname, './ui/components/Layout'),
    },
    virtualImports: {},
    remoteConfig:
      'https://gist.githubusercontent.com/araujogui/8ea72ffaf574f58fca1482e764e8b5c8/raw/16af51e4efbf37da7b6aff9b7e5dd967d955aacf/api-docs.config.json',
  },
});
