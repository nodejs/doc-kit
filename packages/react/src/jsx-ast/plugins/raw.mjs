'use strict';

import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';

import { AST_NODE_TYPES } from '../constants.mjs';

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
 * Converts any `raw` HTML in the Markdown to AST, in order for Recma to
 * understand it, keeping the metadata of fenced code.
 *
 * @type {import('unified').PluggableList}
 */
export default [
  preserveCodeMeta,
  // HTML and JSX nodes pass through, as we created them during the generation
  [
    rehypeRaw,
    { passThrough: ['element', ...Object.values(AST_NODE_TYPES.MDX)] },
  ],
  restoreCodeMeta,
];
