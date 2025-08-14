'use strict';

import { pointEnd, pointStart } from 'unist-util-position';

/**
 * Extracts text content from a node recursively
 *
 * @param {import('unist').Node} node The Node to be transformed into a string
 * @returns {string} The transformed Node as a string
 */
export const transformNodeToString = node => {
  switch (node.type) {
    case 'inlineCode':
      return `\`${node.value}\``;
    case 'strong':
      return `**${transformNodesToString(node.children)}**`;
    case 'emphasis':
      return `_${transformNodesToString(node.children)}_`;
    default: {
      if (node.children) {
        return transformNodesToString(node.children);
      }

      // Replace line breaks (\n) with spaces to keep text in a single line
      return node.value?.replace(/\n/g, ' ') || '';
    }
  }
};

/**
 * This utility allows us to join children Nodes into one
 * and transfor them back to what their source would look like
 *
 * @param {Array<import('unist').Parent & import('unist').Literal>} nodes Nodes to parsed and joined
 * @returns {string} The parsed and joined nodes as a string
 */
export const transformNodesToString = nodes => {
  const mappedChildren = nodes.map(node => transformNodeToString(node));

  return mappedChildren.join('');
};

/**
 * This method is an utility that allows us to conditionally invoke/call a callback
 * based on test conditions related to a Node's position relative to another one
 * being before or not the other Node
 *
 * NOTE: Not yet used, but probably going to be used by the JSON generator.
 *
 * @param {import('unist').Node | undefined} nodeA The Node to be used as a position reference to check against
 * the other Node. If the other Node is before this one, the callback will be called.
 * @param {import('unist').Node | undefined} nodeB The Node to be checked against the position of the first Node
 * @param {(nodeA: import('unist').Node, nodeB: import('unist').Node) => void} callback The callback to be called
 */
export const callIfBefore = (nodeA, nodeB, callback) => {
  const positionA = pointEnd(nodeA);
  const positionB = pointStart(nodeB);

  if (positionA && positionB && positionA.line > positionB.line) {
    callback(nodeA, nodeB);
  }
};
