'use strict';

import { generate } from './generate.mjs';

/**
 * Adds `all.html`, every module page's content on one page, to the pages the
 * `html` generator renders. It builds nothing itself: it passes `jsx-ast`'s
 * pages on to `html`, and, once every module page has passed, a page made of
 * theirs, which `html` assembles from their compiled content.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'html-all',

  description:
    'Adds all.html, every module page on one page, to the html generator',

  dependsOn: '@doc-kit/generator-react/jsx-ast',

  streamsInput: true,

  dependent: '@doc-kit/generator-react/html',

  generate,
};
