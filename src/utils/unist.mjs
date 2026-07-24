'use strict';

import { pointEnd, pointStart } from 'unist-util-position';

/**
 * Escapes HTML entities in a string.
 *
 * @param {string} value
 * @returns {string}
 */
const escapeHTMLEntities = value =>
  value.replace(/[<>]/g, character => (character === '<' ? '&lt;' : '&gt;'));

/**
 * Converts a node tree back into its source-like string representation.
 *
 * @param {import('unist').Node} node
 * @param {boolean} [escape]
 * @returns {string}
 */
export const transformNodeToString = (node, escape) => {
  switch (node.type) {
    case 'inlineCode':
      return `\`${escape ? escapeHTMLEntities(node.value) : node.value}\``;

    case 'typeAnnotation':
      return `{${escape ? escapeHTMLEntities(node.value) : node.value}}`;

    case 'strong':
      return `**${transformNodesToString(node.children, escape)}**`;

    case 'emphasis':
      return `_${transformNodesToString(node.children, escape)}_`;

    default:
      if (node.children) {
        return transformNodesToString(node.children, escape);
      }

      if (!node.value) {
        return '';
      }

      // eslint-disable-next-line no-case-declarations
      const value = node.value.replace(/\n/g, ' ');

      return escape ? escapeHTMLEntities(value) : value;
  }
};

/**
 * Joins child nodes into their source-like string representation.
 *
 * @param {Array<import('unist').Node>} nodes
 * @param {boolean} [escape]
 * @returns {string}
 */
export const transformNodesToString = (nodes, escape) => {
  let result = '';

  for (const node of nodes) {
    result += transformNodeToString(node, escape);
  }

  return result;
};

/**
 * Calls a callback when nodeA appears after nodeB.
 *
 * @param {import('unist').Node | undefined} nodeA
 * @param {import('unist').Node | undefined} nodeB
 * @param {(nodeA: import('unist').Node, nodeB: import('unist').Node) => void} callback
 */
export const callIfBefore = (nodeA, nodeB, callback) => {
  if (!nodeA || !nodeB) {
    return;
  }

  const positionA = pointEnd(nodeA);
  const positionB = pointStart(nodeB);

  if (!positionA || !positionB) {
    return;
  }

  if (positionA.line > positionB.line) {
    callback(nodeA, nodeB);
  }
};
