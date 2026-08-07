'use strict';

import { pointEnd, pointStart } from 'unist-util-position';

/**
 * Escapes HTML entities ("<" and ">") in a string
 * @param {string} string The string
 */
const escapeHTMLEntities = string =>
  string.replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Extracts text content from a node recursively
 *
 * @param {import('unist').Node} node The Node to be transformed into a string
 * @param {boolean} [escape] Escape HTML entities ("<", ">")?
 * @returns {string} The transformed Node as a string
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
    default: {
      if (node.children) {
        return transformNodesToString(node.children, escape);
      }

      const string = node.value?.replace(/\n/g, ' ') || '';

      // Replace line breaks (\n) with spaces to keep text in a single line
      return escape ? escapeHTMLEntities(string) : string;
    }
  }
};

/**
 * This utility allows us to join children Nodes into one
 * and transfor them back to what their source would look like
 *
 * @param {Array<import('unist').Parent & import('unist').Literal>} nodes Nodes to parsed and joined
 * @param {boolean} [escape] Escape HTML entities ("<", ">")?
 * @returns {string} The parsed and joined nodes as a string
 */
export const transformNodesToString = (nodes, escape) => {
  const mappedChildren = nodes.map(node => transformNodeToString(node, escape));

  return mappedChildren.join('');
};

/**
 * Stringifies a value while dropping every node (in any `children`-style
 * array) that matches one of the given tests, without mutating the input.
 * Deep removal equivalent to `unist-util-remove`, expressed as a
 * `JSON.stringify` replacer so shared trees stay intact for other consumers.
 *
 * @param {unknown} value The value to stringify
 * @param {Array<(node: import('unist').Node) => boolean>} tests Nodes matching any test are omitted
 * @param {string | number} [space] Forwarded to `JSON.stringify`
 * @returns {string} The filtered JSON string
 */
export const stringifyWithout = (value, tests, space) =>
  JSON.stringify(
    value,
    (_, val) =>
      Array.isArray(val)
        ? val.filter(
            node =>
              node === null ||
              typeof node !== 'object' ||
              !tests.some(test => test(node))
          )
        : val,
    space
  );

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
