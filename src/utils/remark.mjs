'use strict';

import rehypeShikiji from '@node-core/rehype-shiki/plugin';
import recmaJsx from 'recma-jsx';
import recmaStringify from 'recma-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeRecma from 'rehype-recma';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import syntaxHighlighter, { highlighter } from './highlighter.mjs';
import { AST_NODE_TYPES } from '../generators/jsx-ast/constants.mjs';
import transformElements from '../generators/jsx-ast/utils/transformer.mjs';

const passThrough = ['element', ...Object.values(AST_NODE_TYPES.MDX)];

/**
 * Retrieves an instance of Remark configured to parse GFM (GitHub Flavored Markdown)
 */
export const getRemark = () =>
  unified().use(remarkParse).use(remarkGfm).use(remarkStringify);

/**
 * Retrieves an instance of Remark configured to output stringified HTML code
 * including parsing Code Boxes with syntax highlighting
 */
export const getRemarkRehype = () =>
  unified()
    .use(remarkParse)
    // We make Rehype ignore existing HTML nodes (just the node itself, not its children)
    // as these are nodes we manually created during the rehype process
    // We also allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(remarkRehype, { allowDangerousHtml: true, passThrough })
    // This is a custom ad-hoc within the Shiki Rehype plugin, used to highlight code
    // and transform them into HAST nodes
    // @TODO: Get rid of @shikijis/rehype and use our own Rehype plugin for Shiki
    // since we have CJS/ESM nodes. (Base off from the nodejs/nodejs.org repository)
    .use(syntaxHighlighter)
    // We allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(rehypeStringify, { allowDangerousHtml: true });

const singletonShiki = await rehypeShikiji({ highlighter });

/**
 * Retrieves an instance of Remark configured to output JSX code.
 * including parsing Code Boxes with syntax highlighting
 */
export const getRemarkRecma = () =>
  unified()
    .use(remarkParse)
    // We make Rehype ignore existing HTML nodes, and JSX nodes
    // as these are nodes we manually created during the generation process
    // We also allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(remarkRehype, {
      allowDangerousHtml: true,
      passThrough,
    })
    // Any `raw` HTML in the markdown must be converted to AST in order for Recma to understand it
    .use(rehypeRaw, { passThrough })
    .use(() => singletonShiki)
    .use(transformElements)
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaStringify);
