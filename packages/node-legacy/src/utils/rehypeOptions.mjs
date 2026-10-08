'use strict';

import { typeAnnotationToHast } from '@doc-kit/core/plugins/type-annotations/hast.mjs';

/**
 * A `remark-rehype` handler, turning an mdast node into hast.
 *
 * @typedef {NonNullable<import('remark-rehype').Options['unknownHandler']>} Handler
 */

/**
 * Renders an MDX JSX element as just its children, so the surrounding prose
 * still renders in HTML-string output.
 *
 * @type {Handler}
 */
const mdxElementToChildren = (state, node) => state.all(node);

/**
 * Drops a node from HTML-string output.
 *
 * @type {Handler}
 */
const dropNode = () => undefined;

/**
 * The `remark-rehype` options of the legacy generators, which render Markdown
 * into HTML strings.
 *
 * Existing HTML nodes pass through untouched (they were created during the
 * rehype process), and dangerous HTML is allowed since the Markdown sources
 * are trusted. The MDX node types cannot be rendered to an HTML string (that
 * is the React generators' job): JSX elements degrade to their children so the
 * surrounding prose still renders, and expressions/ESM are dropped.
 *
 * @type {import('remark-rehype').Options}
 */
export const rehypeOptions = {
  allowDangerousHtml: true,
  passThrough: ['element'],
  handlers: {
    typeAnnotation: typeAnnotationToHast,
    mdxJsxTextElement: mdxElementToChildren,
    mdxJsxFlowElement: mdxElementToChildren,
    mdxFlowExpression: dropNode,
    mdxTextExpression: dropNode,
    mdxjsEsm: dropNode,
  },
};
