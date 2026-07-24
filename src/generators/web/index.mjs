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
 * The configured bundler writes the complete static site to the output
 * directory; this terminal generator does not return an in-memory copy.
 *
 * `jsx-ast` serializes each page's JSX AST to a `code` string inside its worker,
 * so this generator only ever handles small `{ data, code }` items — the heavy
 * ASTs (notably the giant `all` page) never reach the main thread. Bundling and
 * rendering run once over the accumulated code, since code-splitting and the
 * sidebar need every entry together.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'web',

  version: '1.0.0',

  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',

  dependsOn: 'jsx-ast',

  /**
   * @param {import('../../utils/configuration/types').Configuration} config
   */
  defaultConfiguration: config => ({
    templatePath: join(import.meta.dirname, 'template.html'),
    project: 'Node.js',
    title: '{project} {version} Documentation',
    useAbsoluteURLs: false,
    editURL: `${GITHUB_EDIT_URL}/doc/api{path}.md`,
    pageURL: '{baseURL}/latest-{version}/api{path}.html',
    remoteConfigUrl: 'https://nodejs.org/site.json',
    // By default, the search box is only shown when we are _also_ building search data
    showSearchBox:
      Array.isArray(config.target) && config.target.includes('orama-db'),

    // Project-specific document `<head>` contents. `meta` and `links` are
    // arrays of attribute bags (boolean `true` renders a valueless attribute,
    // e.g. `crossorigin`); `html` holds arbitrary raw markup as an escape
    // hatch. Structural/theme tags such as `og:type` are hardcoded in the
    // template instead.
    head: {
      meta: [
        {
          name: 'description',
          content:
            'Node.js® is a free, open-source, cross-platform JavaScript ' +
            'runtime environment that lets developers create servers, web ' +
            'apps, command line tools and scripts.',
        },
        {
          property: 'og:description',
          content:
            'Node.js® is a free, open-source, cross-platform JavaScript ' +
            'runtime environment that lets developers create servers, web ' +
            'apps, command line tools and scripts.',
        },
        {
          property: 'og:image',
          content:
            'https://nodejs.org/en/next-data/og/announcement/Node.js%20%E2%80%94%20Run%20JavaScript%20Everywhere',
        },
      ],
      links: [
        {
          rel: 'icon',
          href: 'https://nodejs.org/static/images/favicons/favicon.png',
        },
      ],
      html: [],
    },

    imports: {
      '#theme/Logo': '@node-core/ui-components/Common/NodejsLogo',
      '#theme/Navigation': join(import.meta.dirname, './ui/components/NavBar'),
      '#theme/Sidebar': join(import.meta.dirname, './ui/components/SideBar'),
      '#theme/Metabar': join(import.meta.dirname, './ui/components/MetaBar'),
      '#theme/Footer': join(import.meta.dirname, './ui/components/NoOp'),
      '#theme/Layout': join(import.meta.dirname, './ui/components/Layout'),
    },
    virtualImports: {},

    // Maps JSX tag names to component imports for JSX-in-MDX. Empty by default;
    // see the web generator README for the shape and shorthand.
    components: {},

    // When omitted, the Vite adapter is loaded lazily during generation.
    bundler: undefined,
  }),
});
