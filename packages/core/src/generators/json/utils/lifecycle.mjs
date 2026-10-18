'use strict';

import { enforceArray } from '#utils/array.mjs';
import { removeStabilityPrefix } from '#utils/stability.mjs';

import { blocksToMarkdown } from './markdown.mjs';

/**
 * Normalises a YAML version field
 *
 * @param {unknown} value
 * @returns {Array<string>}
 */
export const toVersions = value =>
  value == null ? [] : enforceArray(value).map(String);

/**
 * Normalises a YAML number field
 *
 * @param {unknown} value
 * @returns {Array<number>}
 */
export const toNumbers = value =>
  value == null ? [] : enforceArray(value).map(Number);

/**
 * Normalises a YAML `changes` list
 *
 * @param {unknown} changes
 * @returns {Array<import('../types').Change>}
 */
export const toChanges = changes =>
  enforceArray(changes ?? []).map(change => ({
    versions: toVersions(change.version),
    prUrl: change['pr-url'] == null ? null : String(change['pr-url']),
    commit: change.commit == null ? null : String(change.commit),
    description: String(change.description ?? '').trim(),
  }));

/**
 * Builds an entry's stability index
 *
 * @param {import('../../metadata/types').StabilityNode | undefined} node
 * @param {boolean} [mdx] Whether the node comes from an MDX document
 * @returns {import('../types').Stability | null}
 */
export const toStability = (node, mdx) => {
  if (!node) {
    return null;
  }

  const { index, description } = node.data;
  const body = removeStabilityPrefix(node);

  return {
    index: String(index),
    description: body?.children.length
      ? blocksToMarkdown(body.children, mdx)
      : description,
  };
};
