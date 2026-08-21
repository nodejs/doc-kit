'use strict';

import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import syntaxHighlighter from './highlighter.mjs';
import { lazy } from './misc.mjs';
import { typeAnnotationToHast } from './type-annotations/hast.mjs';
import remarkTypeAnnotations from './type-annotations/remark.mjs';

// Nodes the rehype pipelines pass through untouched.
const passThrough = ['element'];

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

// The HTML-string pipelines cannot render MDX nodes (rendering those is the
// React generators' job): JSX elements degrade to their children so the
// surrounding prose still renders, and expressions/ESM are dropped.
const mdxToHastHandlers = {
  mdxJsxTextElement: mdxElementToChildren,
  mdxJsxFlowElement: mdxElementToChildren,
  mdxFlowExpression: dropNode,
  mdxTextExpression: dropNode,
  mdxjsEsm: dropNode,
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
  unified().use(remarkParse).use(remarkMdx).use(remarkGfm)
);

/**
 * Retrieves an instance of Remark configured to output stringified HTML code
 */
export const getRemarkRehype = lazy(() =>
  unified()
    .use(remarkParse)
    // We make Rehype ignore existing HTML nodes (just the node itself, not its children)
    // as these are nodes we manually created during the rehype process
    // We also allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(remarkRehype, {
      allowDangerousHtml: true,
      passThrough,
      handlers: { typeAnnotation: typeAnnotationToHast, ...mdxToHastHandlers },
    })
    // We allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(rehypeStringify, { allowDangerousHtml: true })
);

/**
 * Retrieves an instance of Remark configured to output stringified HTML code
 * including parsing Code Boxes with syntax highlighting
 */
export const getRemarkRehypeWithShiki = lazy(() =>
  unified()
    .use(remarkParse)
    // We make Rehype ignore existing HTML nodes (just the node itself, not its children)
    // as these are nodes we manually created during the rehype process
    // We also allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(remarkRehype, {
      allowDangerousHtml: true,
      passThrough,
      // legacy-html gets the minimal (unhighlighted) type rendering
      handlers: { typeAnnotation: typeAnnotationToHast, ...mdxToHastHandlers },
    })
    // This is a custom ad-hoc within the Shiki Rehype plugin, used to highlight code
    // and transform them into HAST nodes
    .use(syntaxHighlighter)
    // We allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(rehypeStringify, { allowDangerousHtml: true })
);
