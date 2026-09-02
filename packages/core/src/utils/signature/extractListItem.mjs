'use strict';

import { QUERIES, UNIST } from '#utils/queries/index.mjs';
import { transformNodesToString } from '#utils/unist.mjs';

import { DEFAULT_EXPRESSION, TRIMMABLE_PADDING_REGEX } from './constants.mjs';

// The text of the `**Default:**` marker introducing a default value
const DEFAULT_MARKER = /^default:$/i;

/**
 * A typed list item taken apart into its parts, none of them stringified, so
 * each consumer can render the description its own way.
 *
 * @typedef {object} ExtractedListItem
 * @property {string | undefined} name The parameter name (the leading code span), if any
 * @property {'Returns' | 'Extends' | 'Type' | undefined} prefix The special prefix the item starts with, if any
 * @property {import('mdast').Node | undefined} annotation The leading `typeAnnotation` node, if any
 * @property {Array<import('mdast').PhrasingContent>} text The rest of the first paragraph: the description,
 * with leading separators trimmed and any `**Default:**` marker still in place
 * @property {Array<import('mdast').BlockContent>} blocks The item's further block content, excluding its nested typed list
 * @property {string | undefined} default The `**Default:**` value as written (code span included), if any
 * @property {Array<import('mdast').ListItem>} items The items of the nested typed list, if any
 */

/**
 * Replaces the first node's text, or drops the node when nothing is left.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes
 * @param {string} value The new text of the first node
 */
const replaceLeadingText = (nodes, value) => {
  if (value.trim()) {
    nodes[0] = { ...nodes[0], value };
  } else {
    nodes.shift();
  }
};

/**
 * Takes a typed list item apart: `` `name` {Type} Description. **Default:** `value` ``,
 * or one of the `Returns:`, `Extends:` and `Type:` forms.
 *
 * @param {import('mdast').ListItem} item
 * @returns {ExtractedListItem}
 */
export const extractListItem = item => {
  const [paragraph, ...rest] = item.children ?? [];
  const text = [...(paragraph?.children ?? [])];

  const result = {
    name: undefined,
    prefix: undefined,
    annotation: undefined,
    text,
    blocks: [],
    default: undefined,
    items: [],
  };

  const [first] = text;

  if (first?.type === 'inlineCode') {
    result.name = first.value.trimEnd();
    text.shift();
  } else if (first?.type === 'text') {
    const match = first.value.match(QUERIES.typedListStarters);

    if (match) {
      result.prefix = match[1];
      replaceLeadingText(text, first.value.slice(match[0].length));
    }
  }

  // The whitespace between the name and the type
  if (text[0]?.type === 'text' && !text[0].value.trim()) {
    text.shift();
  }

  if (text[0]?.type === 'typeAnnotation') {
    result.annotation = text.shift();
  }

  // Leading separators: `- description`, `: description`
  if (text[0]?.type === 'text') {
    replaceLeadingText(
      text,
      text[0].value.replace(TRIMMABLE_PADDING_REGEX, '')
    );
  }

  result.default = DEFAULT_EXPRESSION.exec(transformNodesToString(text))?.[1]
    .trim()
    .replace(/\.$/, '');

  for (const node of rest) {
    if (result.items.length === 0 && UNIST.isLooselyTypedList(node)) {
      result.items = node.children;
    } else {
      result.blocks.push(node);
    }
  }

  return result;
};

/**
 * Drops the `**Default:**` marker, and everything after it, from an item's
 * description.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes The item's description
 * @returns {Array<import('mdast').PhrasingContent>} The description without its default value
 */
export const removeDefault = nodes => {
  const index = nodes.findIndex(
    node =>
      node.type === 'strong' &&
      DEFAULT_MARKER.test(transformNodesToString(node.children).trim())
  );

  if (index === -1) {
    return nodes;
  }

  const kept = nodes.slice(0, index);
  const last = kept.at(-1);

  // The whitespace that separated the description from its default
  if (last?.type === 'text') {
    const value = last.value.trimEnd();

    kept.pop();

    if (value) {
      kept.push({ ...last, value });
    }
  }

  return kept;
};
