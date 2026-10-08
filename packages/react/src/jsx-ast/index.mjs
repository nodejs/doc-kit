'use strict';

import { getHighlighter } from '@doc-kit/core/plugins/shiki/highlighter.mjs';
import { createTypeAnnotationHandler } from '@doc-kit/core/plugins/type-annotations/highlighter.mjs';

import { AST_NODE_TYPES } from './constants.mjs';
import { generate, processChunk } from './generate.mjs';

/**
 * Generator for converting MDAST to JSX AST.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'jsx-ast',

  description: 'Generates JSX AST from the input MDAST',

  dependsOn: '@doc-kit/core/metadata',

  defaultConfiguration: {
    ref: 'main',
    generateNotFoundPage: true,
    showReadingTime: false,
  },

  hasParallelProcessor: true,

  markdown: {
    // The configured remark plugins run before the alerts, so they can make
    // alerts too
    remarkPlugins: ['remark-parse', '...', './plugins/alerts.mjs'],
    rehypePlugins: [
      [
        'remark-rehype',
        {
          // We make Rehype ignore existing HTML nodes, and JSX nodes as these
          // are nodes we manually created during the generation process. We
          // also allow dangerous HTML to be passed through, since we have HTML
          // within our Markdown and we trust the sources of the Markdown files
          allowDangerousHtml: true,
          passThrough: ['element', ...Object.values(AST_NODE_TYPES.MDX)],
          // Types are highlighted, with their links embedded
          handlers: {
            typeAnnotation: createTypeAnnotationHandler(() =>
              getHighlighter('jsx-ast')
            ),
          },
        },
      ],
      './plugins/raw.mjs',
      // The configured rehype plugins run before code blocks are highlighted
      '...',
      '@doc-kit/core/plugins/shiki/rehype.mjs',
      './plugins/transformer.mjs',
    ],
    recmaPlugins: ['rehype-recma', 'recma-jsx', '...', 'recma-stringify'],
  },

  generate,
  processChunk,
};
