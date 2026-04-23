'use strict';

import { highlighter } from '#core/utils/highlighter.mjs';
import rehypeShikiji from '@node-core/rehype-shiki/plugin';
import recmaJsx from 'recma-jsx';
import recmaStringify from 'recma-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeRecma from 'rehype-recma';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { AST_NODE_TYPES } from './constants.mjs';
import transformElements from './transformer.mjs';

const passThrough = ['element', ...Object.values(AST_NODE_TYPES.MDX)];

const singletonShiki = await rehypeShikiji({ highlighter });

/**
 * Retrieves an instance of Remark configured to output JSX code,
 * including parsing Code Boxes with syntax highlighting.
 */
export const getRemarkRecma = () =>
  unified()
    .use(remarkParse)
    // We make Rehype ignore existing HTML nodes, and JSX nodes
    // as these are nodes we manually created during the generation process
    // We also allow dangerous HTML to be passed through, since we have HTML within our Markdown
    // and we trust the sources of the Markdown files
    .use(remarkRehype, { allowDangerousHtml: true, passThrough })
    // Any `raw` HTML in the markdown must be converted to AST in order for Recma to understand it
    .use(rehypeRaw, { passThrough })
    .use(() => singletonShiki)
    .use(transformElements)
    .use(rehypeRecma)
    .use(recmaJsx)
    .use(recmaStringify);
