'use strict';

import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import { lazy } from './misc.mjs';
import { typeAnnotationToHast } from './type-annotations/hast.mjs';
import remarkTypeAnnotations from './type-annotations/remark.mjs';

// Nothing in this module loads Shiki: the `ast` and `metadata` stages (and
// every worker that runs them) import it, and none of them highlight code.
// The highlighting pipeline lives in `./remark-shiki.mjs`.

/**
 * Renders an MDX JSX element as just its children, so the surrounding prose
 * still renders in HTML-string output.
 *
 * @param {import('mdast-util-to-hast').State} state
 * @param {import('unist').Parent} node
 */
const mdxElementToChildren = (state, node) => state.all(node);

/**
 * Drops a node from HTML-string output.
 */
const dropNode = () => undefined;

/**
 * The `remark-rehype` options shared by the HTML-string pipelines.
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

/**
 * Retrieves an instance of Remark configured to parse GFM (GitHub Flavored Markdown)
 * plus `{...}` type annotations (see `./type-annotations`), which only exist
 * in non-MDX files — the MDX pipeline below never registers them.
 */
export const getRemark = lazy(() =>
  unified()
    .use(remarkParse)
    .use(remarkTypeAnnotations)
    .use(remarkGfm)
    .use(remarkStringify)
);

/**
 * Retrieves an instance of Remark configured to parse MDX (JSX-in-Markdown).
 *
 * Unlike {@link getRemark}, this understands `<Component />` and `{expression}`
 * syntax as real JSX/expression nodes. It is only used for `.mdx` (or
 * explicitly opted-in) files, since Node.js core `.md` files use bare `<` and
 * `{` for type annotations that MDX would otherwise try to parse.
 */
export const getRemarkMdx = lazy(() =>
  unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkStringify)
);

/**
 * Retrieves an instance of Remark configured to output stringified HTML code
 */
export const getRemarkRehype = lazy(() =>
  unified()
    .use(remarkParse)
    .use(remarkRehype, rehypeOptions)
    .use(rehypeStringify, { allowDangerousHtml: true })
);
