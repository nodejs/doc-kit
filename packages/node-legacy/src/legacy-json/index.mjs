'use strict';

import { rehypeOptions } from '../utils/rehypeOptions.mjs';
import { generate, processChunk } from './generate.mjs';

/**
 * This generator is responsible for generating the legacy JSON files for the
 * legacy API docs for retro-compatibility. It is to be replaced while we work
 * on the new schema for this file.
 *
 * This is a top-level generator, intaking the raw AST tree of the api docs.
 * It generates JSON files to the specified output directory given by the
 * config.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'legacy-json',

  description: 'Generates the legacy version of the JSON API docs.',

  dependsOn: '@doc-kit/core/metadata',

  defaultConfiguration: {
    ref: 'main',
    minify: false,
    sourceURL: 'doc/api/{path}',
  },

  hasParallelProcessor: true,

  // Renders the descriptions' Markdown into HTML. It takes no configured
  // plugins, which would change the legacy output
  markdown: {
    rehypePlugins: [
      ['remark-rehype', rehypeOptions],
      ['rehype-stringify', { allowDangerousHtml: true }],
    ],
  },

  generate,
  processChunk,
};
