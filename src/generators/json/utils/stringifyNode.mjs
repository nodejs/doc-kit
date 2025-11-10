'use strict';

import { GeneratorError } from '../../../utils/generator-error.mjs';

/**
 * Turn contents of a node into a string
 * @param {import('mdast').PhrasingContent} node
 * @returns
 */
export function stringifyNode(node) {
  let value = '';

  switch (node.type) {
    case 'break':
      value += '\n';
      break;
    case 'delete':
      value += `~~${node.children.map(stringifyNode).join(' ')}~~`;
      break;
    case 'emphasis':
      value += `*${node.children.map(stringifyNode).join(' ')}*`;
      break;
    case 'text':
      if (node.value !== ' ') {
        value += node.value;
      }
      break;
    case 'strong':
      value += `**${node.children.map(stringifyNode).join(' ')}**`;
      break;
    case 'inlineCode':
      value += `\`${node.value}\``;
      break;
    case 'link':
      value = `[${node.title ?? node.children.map(stringifyNode).join(' ')}](${node.url})`;
      break;
    case 'html':
      // Not actually html, or probably at least. Types mentioned like
      // `<string>` are put in the string as html nodes
      value += node.value;
      break;
    case 'footnoteReference':
      break;
    default:
      throw new GeneratorError(`Unsupported node type: ${node.type}`);
  }

  return value;
}
