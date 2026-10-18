'use strict';

import { join } from 'node:path';

import { generate } from './generate.mjs';
import { processChunk } from './utils/render.mjs';

/**
 * Web generator - transforms the pages' JSX into a complete static site.
 *
 * This generator takes the `jsx-ast` output and produces:
 * - Server-side rendered HTML pages
 * - Client-side JavaScript with code splitting
 * - Bundled CSS styles
 *
 * The configured bundler builds the component library and the client assets
 * once each; the pages are then compiled, rendered, templated, minified and
 * written one at a time by the worker pool, so memory scales with the largest
 * page rather than with the site. `all.html` is assembled from the module
 * pages' compiled content instead of being built again from scratch.
 *
 * This terminal generator writes to the output directory and does not return
 * an in-memory copy.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'html',

  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',

  dependsOn: '@doc-kit/generator-react/jsx-ast',

  /**
   * @param {import('@doc-kit/core/utils/configuration/types').Configuration} config
   */
  defaultConfiguration: config => ({
    templatePath: join(import.meta.dirname, 'template.html'),
    title: '{project} {version} Documentation',
    useAbsoluteURLs: false,
    pageURL: '{baseURL}{path}.html',
    // By default, the search box is only shown when we are _also_ building
    // search data. `target` holds resolved import specifiers, so match on the
    // subpath rather than an exact name.
    showSearchBox:
      Array.isArray(config.target) &&
      config.target.some(target => target.endsWith('orama-db')),

    // Project-specific document `<head>` contents. `meta` and `links` are
    // arrays of attribute bags (boolean `true` renders a valueless attribute,
    // e.g. `crossorigin`); `html` holds arbitrary raw markup as an escape
    // hatch. Structural/theme tags such as `og:type` are hardcoded in the
    // template instead.
    head: {
      meta: [],
      links: [],
      html: [],
    },

    // Extra stylesheets
    stylesheets: [],

    imports: {
      '#theme/Logo': join(import.meta.dirname, './ui/components/ProjectName'),
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

    // The SideBar and NavBar navigation items
    // along with other navigational settings (e.g. showCrossLinks)
    navigation: {
      // Whether or not to show the CrossLink component at the bottom of the
      // default layout.
      showCrossLinks: false,
    },

    // Whether to write `all.html`: every module page's content on one page,
    // assembled from the module pages rather than built again.
    generateAllPage: true,

    // When omitted, the Vite adapter is loaded lazily during generation.
    bundler: undefined,
  }),

  generate,

  // Rendering, templating, minifying and writing the pages scales with the
  // page count, so it is farmed out to the worker pool.
  hasParallelProcessor: true,

  processChunk,
};
