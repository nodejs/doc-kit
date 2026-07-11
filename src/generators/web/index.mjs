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

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.html'),
    project: 'Node.js',
    title: '{project} {version} Documentation',
    useAbsoluteURLs: false,
    editURL: `${GITHUB_EDIT_URL}/doc/api{path}.md`,
    pageURL: '{baseURL}/latest-{version}/api{path}.html',
    remoteConfigUrl: 'https://nodejs.org/site.json',
    showSearchBar: undefined,

    // Project-specific document `<head>` contents. `meta` and `links` are
    // arrays of attribute bags (boolean `true` renders a valueless attribute,
    // e.g. `crossorigin`); `html` holds arbitrary raw markup as an escape
    // hatch. Structural/theme tags (`og:type`, font preconnects/stylesheets)
    // are hardcoded in the template instead.
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

    // Options spread directly into LightningCSS when bundling CSS, e.g.
    // `visitor`, `customAtRules`, `targets`, or `drafts`. See
    // https://lightningcss.dev/transforms.html for the full set.
    lightningcss: {},

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

    // Options merged into the Rolldown build (client and server), e.g. extra
    // `plugins`. See the README for the merge semantics.
    rolldown: {},
  },
});
