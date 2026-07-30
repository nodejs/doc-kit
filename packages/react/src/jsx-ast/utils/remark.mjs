'use strict';

import rehypeShikiji from '@node-core/rehype-shiki/plugin';
import { highlighter } from '@nodejs/doc-kit/utils/highlighter.mjs';
import { lazy } from '@nodejs/doc-kit/utils/misc.mjs';
import { typeAnnotationToHighlightedHast } from '@nodejs/doc-kit/utils/type-annotations/hast.mjs';
import recmaJsx from 'recma-jsx';
import recmaStringify from 'recma-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeRecma from 'rehype-recma';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { AST_NODE_TYPES } from '../constants.mjs';
import transformAlerts from './plugins/alerts.mjs';
import transformElements from './plugins/transformer.mjs';

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
