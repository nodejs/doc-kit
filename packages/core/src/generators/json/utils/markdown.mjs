'use strict';

import { u as createTree } from 'unist-builder';
import { visit } from 'unist-util-visit';

import { getRemark, getRemarkMdx } from '#utils/remark.mjs';

import { DISPLAY_NAME } from '../constants.mjs';

/**
 * Serialises block nodes back to Markdown.
 *
 * @param {Array<import('mdast').RootContent>} nodes
 * @param {boolean} [mdx] Whether the nodes come from an MDX document
 * @returns {string}
 */
export const blocksToMarkdown = (nodes, mdx = false) => {
  if (nodes.length === 0) {
    return '';
  }

  const processor = mdx ? getRemarkMdx() : getRemark();

  return processor.stringify(createTree('root', nodes)).trim();
};

/**
 * Serialises phrasing (inline) nodes back to Markdown.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes
 * @param {boolean} [mdx] Whether the nodes come from an MDX document
 * @returns {string}
 */
export const inlineToMarkdown = (nodes, mdx) =>
  nodes.length === 0
    ? ''
    : blocksToMarkdown([createTree('paragraph', nodes)], mdx);

/**
 * Collects the fenced code blocks of a body, in order.
 *
 * @param {Array<import('mdast').RootContent>} nodes
 * @returns {Array<import('../types').Example>}
 */
export const extractExamples = nodes => {
  const examples = [];

  visit(createTree('root', nodes), 'code', node => {
    examples.push({
      language: node.lang ?? null,
      displayName: DISPLAY_NAME.exec(node.meta ?? '')?.[1] ?? null,
      code: node.value,
    });
  });

  return examples;
};
