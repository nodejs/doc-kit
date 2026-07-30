'use strict';

import rehypeShikiji from '@node-core/rehype-shiki/plugin';
import recmaJsx from 'recma-jsx';
import recmaStringify from 'recma-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeRecma from 'rehype-recma';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import syntaxHighlighter, { highlighter } from './highlighter.mjs';
import { lazy } from './misc.mjs';
import {
  typeAnnotationToHast,
  typeAnnotationToHighlightedHast,
} from './type-annotations/hast.mjs';
import remarkTypeAnnotations from './type-annotations/remark.mjs';
import { AST_NODE_TYPES } from '../generators/jsx-ast/constants.mjs';
import transformAlerts from '../generators/jsx-ast/utils/plugins/alerts.mjs';
import transformElements from '../generators/jsx-ast/utils/plugins/transformer.mjs';

const passThrough = ['element', ...Object.values(AST_NODE_TYPES.MDX)];
const codeMetaProperty = 'codeMeta';

/**
 * Stores fenced code metadata on properties before rehypeRaw reparses the tree.
 */
const preserveCodeMeta = () => tree => {
  visit(tree, 'element', node => {
    const meta = node.data?.meta;

    if (node.tagName === 'code' && typeof meta === 'string') {
      node.properties ||= {};
      node.properties[codeMetaProperty] = meta;
    }
  });
};

/**
 * Restores fenced code metadata so the Shiki plugin can read displayName.
 */
const restoreCodeMeta = () => tree => {
  visit(tree, 'element', node => {
    const meta = node.properties?.[codeMetaProperty];

    if (node.tagName === 'code' && typeof meta === 'string') {
      node.data = { ...node.data, meta };
      delete node.properties[codeMetaProperty];
    }
  });
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
      handlers: { typeAnnotation: typeAnnotationToHast },
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
      handlers: { typeAnnotation: typeAnnotationToHast },
    })
    // This is a custom ad-hoc within the Shiki Rehype plugin, used to highlight code
    // and transform them into HAST nodes
    .use(syntaxHighlighter)
    // We allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(rehypeStringify, { allowDangerousHtml: true })
);

const singletonShiki = await rehypeShikiji({ highlighter });

/**
 * Retrieves an instance of Remark configured to output JSX code.
 * including parsing Code Boxes with syntax highlighting
 */
export const getRemarkRecma = lazy(() =>
  unified()
    .use(remarkParse)
    .use(transformAlerts)
    // We make Rehype ignore existing HTML nodes, and JSX nodes
    // as these are nodes we manually created during the generation process
    // We also allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(remarkRehype, {
      allowDangerousHtml: true,
      passThrough,
      // The web pipeline gets Shiki-highlighted types with embedded links
      handlers: { typeAnnotation: typeAnnotationToHighlightedHast },
    })
    .use(preserveCodeMeta)
    // Any `raw` HTML in the markdown must be converted to AST in order for Recma to understand it
    .use(rehypeRaw, { passThrough })
    .use(restoreCodeMeta)
    .use(() => singletonShiki)
    .use(transformElements)
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaStringify)
);
