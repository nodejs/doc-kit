'use strict';

import { GeneratorError } from '../../../utils/generator-error.mjs';

/**
 * Turn contents of a node into a string
 * @param {import('mdast').PhrasingContent} node
 * @returns
 */
export function stringifyNode(node) {
  let value = '';

  // Similar to what we're doing when creating the description in the
  // section base but less in depth
  switch (node.type) {
    case 'text':
      value += node.value;
      break;
    case 'strong':
      value += `**${node.children.map(stringifyNode).join(' ')}**`;
      break;
    case 'inlineCode':
      value += `\`${node.value}\``;
      break;
    case 'link':
      value = `[${node.label ?? node.value}](${node.url})`;
      break;
    case 'html':
      // Not actually html, or probably at least
      value += node.value;
      break;
    case 'footnoteReference':
      break;
    default:
      throw new GeneratorError(`Unsupported node type: ${node.type}`);
  }

  return value;
}
