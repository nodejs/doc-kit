'use strict';

import { u as createTree } from 'unist-builder';

import {
  extractListItem,
  removeDefault,
} from '#utils/signature/extractListItem.mjs';
import parseSignature from '#utils/signature/parseSignature.mjs';

import {
  CODE_SPAN,
  DECLARED_DEFAULT,
  EXTENDS_CLAUSE,
  REST_MARKER,
} from '../constants.mjs';
import { blocksToMarkdown } from './markdown.mjs';
import { plainType, toType } from './types.mjs';

// What a parameter declared in a heading but absent from the typed list has
const EMPTY_ITEM = {
  name: undefined,
  prefix: undefined,
  annotation: undefined,
  text: [],
  blocks: [],
  default: undefined,
  items: [],
};

/**
 * The Markdown of a list item's description
 *
 * @param {import('#utils/signature/extractListItem.mjs').ExtractedListItem} item
 * @param {boolean} [mdx] Whether the item comes from an MDX document
 * @returns {string}
 */
export const itemDescription = ({ text, blocks }, mdx) => {
  const description = removeDefault(text);

  return blocksToMarkdown(
    [
      ...(description.length ? [createTree('paragraph', description)] : []),
      ...blocks,
    ],
    mdx
  );
};

/**
 * A default value as authored, without the code span around it.
 *
 * @param {string | undefined} value
 * @returns {string | null}
 */
const toDefault = value =>
  value === undefined
    ? null
    : value.replace(DECLARED_DEFAULT, '').replace(CODE_SPAN, '$1');

/**
 * Builds a parameter from its list item and, for a callable, its declaration
 * in the heading.
 *
 * @param {import('#utils/signature/extractListItem.mjs').ExtractedListItem} item
 * @param {import('#utils/signature/types').Parameter} [declared] The heading's declaration
 * @param {boolean} [mdx] Whether the item comes from an MDX document
 * @returns {import('../types').Parameter}
 */
export const toParameter = (item, declared = {}, mdx) => {
  const name = declared.name ?? item.name ?? '';
  const value = item.default ?? declared.default;

  return {
    name: name.replace(REST_MARKER, ''),
    type: toType(item.annotation),
    description: itemDescription(item, mdx),
    default: toDefault(value),
    optional: Boolean(declared.optional) || value !== undefined,
    rest: REST_MARKER.test(name),
    properties: item.items.map(nested =>
      toParameter(extractListItem(nested), undefined, mdx)
    ),
  };
};

/**
 * Wraps an extracted item the way `parseSignature` matches parameters
 * (by name, with the nested items as `options`)
 *
 * @param {import('#utils/signature/extractListItem.mjs').ExtractedListItem} item
 */
const toMarkdownParameter = item => ({
  name: item.prefix
    ? item.prefix === 'Returns'
      ? 'return'
      : item.prefix.toLowerCase()
    : item.name,
  options: item.items.map(nested =>
    toMarkdownParameter(extractListItem(nested))
  ),
  item,
});

/**
 * Builds a return value from its `Returns:` item.
 *
 * @param {import('#utils/signature/extractListItem.mjs').ExtractedListItem} item
 * @param {boolean} [mdx] Whether the item comes from an MDX document
 * @returns {import('../types').Return}
 */
const toReturn = (item, mdx) => ({
  type: toType(item.annotation),
  description: itemDescription(item, mdx),
});

/**
 * Builds the parameters a callable heading declares
 *
 * @param {import('../../metadata/types').HeadingNode} heading
 * @param {Array<import('mdast').ListItem>} items The typed list's items
 * @param {boolean} [mdx] Whether the items come from an MDX document
 * @returns {import('../types').Signature}
 */
export const buildSignature = (heading, items, mdx) => {
  const signature = parseSignature(
    heading.data.text,
    items.map(item => toMarkdownParameter(extractListItem(item)))
  );

  return {
    parameters: signature.params.map(declared =>
      toParameter(declared.item ?? EMPTY_ITEM, declared, mdx)
    ),
    returns: signature.return ? toReturn(signature.return.item, mdx) : null,
  };
};

/**
 * @param {import('../../metadata/types').HeadingNode} heading
 * @param {Array<import('mdast').ListItem>} items The typed list's items
 * @returns {import('../types').Type | null}
 */
export const buildExtends = (heading, items) => {
  const item = items
    .map(extractListItem)
    .find(({ prefix }) => prefix === 'Extends');

  if (item) {
    return toType(item.annotation);
  }

  const [, base] = heading.data.name.split(EXTENDS_CLAUSE);

  return base ? plainType(base) : null;
};

/**
 * A property's basic metadata
 *
 * @param {Array<import('mdast').ListItem>} items The typed list's items
 * @param {boolean} [mdx] Whether the items come from an MDX document
 * @returns {{ type: import('../types').Type | null, default: string | null, description: string }}
 */
export const buildPropertyType = (items, mdx) => {
  const [item] = items.map(extractListItem);

  return item
    ? {
        type: toType(item.annotation),
        default: toDefault(item.default),
        description: itemDescription(item, mdx),
      }
    : { type: null, default: null, description: '' };
};

/**
 * The arguments an event's listeners receive.
 *
 * @param {Array<import('mdast').ListItem>} items The typed list's items
 * @param {boolean} [mdx] Whether the items come from an MDX document
 * @returns {Array<import('../types').Parameter>}
 */
export const buildEventParameters = (items, mdx) =>
  items.map(item => toParameter(extractListItem(item), undefined, mdx));
