'use strict';

import { slice } from 'mdast-util-slice-markdown';
import { toString } from 'mdast-util-to-string';

import { QUERIES } from './queries/index.mjs';

/**
 * The content of a stability blockquote without its `Stability: N - `
 * prefix, as a copy of the blockquote. The prefix may have been turned into a
 * link by the AST stage; the separator goes with it.
 *
 * @param {import('../generators/metadata/types').StabilityNode} node
 * @returns {import('mdast').Blockquote | null} The copy, or `null` when nothing follows the prefix
 */
export const removeStabilityPrefix = node => {
  const text = toString(node.children[0]);
  const match = QUERIES.stabilityIndex.exec(text);
  const start = match ? text.length - match[2].length : 0;

  return slice(node, start, undefined, {
    textHandling: { boundaries: 'preserve' },
  }).node;
};
