'use strict';

import { assertAstType } from '../../../utils/assertAstType.mjs';

/**
 * Types for properties and parameters can be multiple things. In the Markdown
 * source, this looks like `{string | integer | ...}`.
 *
 * JavaScript primitives are converted into links here, ultimately breaking up
 * what would otherwise be just a `text` node in the AST. So, in the AST, this
 * instead looks like [`link` node, `text` node, `link` node, ...].
 *
 * @param {Array<import('mdast').PhrasingContent>} children
 * @param {number} [startingIndex=0]
 * @returns {{ types: Array<string>, endingIndex: number }}
 */
export function parseTypeList(children, startingIndex = 0) {
  /**
   * @type {Array<string>}
   */
  const types = [];
  let endingIndex = startingIndex;

  for (let i = startingIndex; i < children.length; i += 2) {
    const child = children[i];

    if (child.type !== 'link') {
      // Not a type
      break;
    }

    const typeName = assertAstType(child.children[0], ['text', 'inlineCode']);
    types.push(typeName.value.replaceAll('<', '').replaceAll('>', ''));

    const nextChild = children[i + 1];
    if (
      !nextChild ||
      nextChild.type !== 'text' ||
      nextChild.value.trim() !== '|'
    ) {
      // No more types to parse, quit early
      endingIndex = i;
      break;
    }
  }

  return { types, endingIndex };
}
