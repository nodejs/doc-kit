'use strict';

import { generate } from './generate.mjs';

/**
 * Section pages generator - splits each documented module into per-section pages.
 *
 * It takes the flattened metadata entries, and for every module adds a set of
 * extra pages — one per section — alongside the untouched full page:
 *
 * ```text
 * fs.html           the complete module page, exactly as before
 * fs/readFile.html  one section of it (`fs.readFile()`)
 * fs/Dir.html       another (`Class: fs.Dir`, with all of its members)
 * ```
 *
 * It does not render anything itself. Instead it declares the generators it
 * is delivered through: the orchestrator splices it between `metadata` and
 * `jsx-ast` on the way to `html`, so the web pipeline renders the chunk pages
 * just like any other page, and in front of `sitemap`, so they are listed.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'section-pages',

  description:
    'Splits each module into per-section pages, rendered by the html generator',

  dependsOn: '@doc-kit/core/metadata',

  dependent: [
    '@doc-kit/generator-react/html',
    '@doc-kit/generator-react/sitemap',
  ],

  defaultConfiguration: {
    // Headings deeper than this never start a chunk of their own; they stay
    // in the chunk of the closest heading above them.
    maxDepth: 2,
    // Modules (by `api` name) that are never split, on top of those that
    // document no API entry at all (a landing page, a guide), which are never
    // split anyway.
    exclude: [],
  },

  generate,
};
