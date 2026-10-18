'use strict';

import { getEntryDescription } from '#utils/generators.mjs';
import { splitTypedItems, UNIST } from '#utils/queries/index.mjs';
import { extractListItem } from '#utils/signature/extractListItem.mjs';

import { KINDS_WITH_TYPED_LIST } from '../constants.mjs';
import { toChanges, toNumbers, toStability, toVersions } from './lifecycle.mjs';
import { blocksToMarkdown, extractExamples } from './markdown.mjs';

/**
 * Whether a node is a stability index the metadata generator recognised.
 *
 * @param {import('mdast').RootContent} node
 */
const isStabilityIndex = node =>
  node.type === 'blockquote' && node.data?.index !== undefined;

/**
 * An entry's body: its content without its heading and, when the entry
 * carries one, its stability index.
 *
 * @param {import('../../metadata/types').MetadataEntry} entry
 * @returns {Array<import('mdast').RootContent>}
 */
export const entryBody = entry =>
  entry.content.children.filter(
    node =>
      !UNIST.isHeading(node) && !(entry.stability && isStabilityIndex(node))
  );

/**
 * Lifts the leading typed items of the body's first typed list out of the
 * body, for the kinds that turn them into data.
 *
 * @param {Array<import('mdast').RootContent>} body
 * @param {string} kind The node's kind
 * @returns {{ body: Array<import('mdast').RootContent>, items: Array<import('mdast').ListItem> }}
 */
export const takeTypedItems = (body, kind) => {
  const index = KINDS_WITH_TYPED_LIST.has(kind)
    ? body.findIndex(UNIST.isStronglyTypedList)
    : -1;

  if (index === -1) {
    return { body, items: [] };
  }

  const list = body[index];
  const { typed: items, rest } = splitTypedItems(list);

  if (
    kind === 'class' &&
    !items.some(item => extractListItem(item).prefix === 'Extends')
  ) {
    return { body, items: [] };
  }

  return {
    body: body.toSpliced(
      index,
      1,
      ...(rest.length ? [{ ...list, children: rest }] : [])
    ),
    items,
  };
};

/**
 * Builds an entry's metadata and body.
 *
 * @param {import('../../metadata/types').MetadataEntry} entry
 * @param {Array<import('mdast').RootContent>} body The entry's body, minus anything lifted out of it
 * @returns {import('../types').Entry}
 */
export const buildEntry = (entry, body) => ({
  title: entry.heading.data.text,
  stability: toStability(entry.stability, entry.mdx),
  added: toVersions(entry.added),
  deprecated: toVersions(entry.deprecated),
  removed: toVersions(entry.removed),
  napiVersion: toNumbers(entry.napiVersion),
  changes: toChanges(entry.changes),
  description: blocksToMarkdown(body, entry.mdx),
  summary: getEntryDescription(entry),
  examples: extractExamples(body),
});
