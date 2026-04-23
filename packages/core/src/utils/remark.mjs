'use strict';

import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import syntaxHighlighter from './highlighter.mjs';

/**
 * Retrieves an instance of Remark configured to parse GFM (GitHub Flavored Markdown)
 */
export const getRemark = () =>
  unified().use(remarkParse).use(remarkGfm).use(remarkStringify);

/**
 * Retrieves an instance of Remark configured to output stringified HTML code.
 *
 * @param {{ passThrough?: string[] }} [options]
 */
export const getRemarkRehype = ({ passThrough = [] } = {}) =>
  unified()
    .use(remarkParse)
    // We make Rehype ignore existing HTML nodes (just the node itself, not its children)
    // as these are nodes we manually created during the rehype process
    // We also allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(remarkRehype, { allowDangerousHtml: true, passThrough })
    // We allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(rehypeStringify, { allowDangerousHtml: true });

/**
 * Retrieves an instance of Remark configured to output stringified HTML code
 * including parsing Code Boxes with syntax highlighting.
 *
 * @param {{ passThrough?: string[] }} [options]
 */
export const getRemarkRehypeWithShiki = ({ passThrough = [] } = {}) =>
  unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true, passThrough })
    // This is a custom ad-hoc within the Shiki Rehype plugin, used to highlight code
    // and transform them into HAST nodes
    .use(syntaxHighlighter)
    .use(rehypeStringify, { allowDangerousHtml: true });
