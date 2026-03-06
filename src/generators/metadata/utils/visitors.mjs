'use strict';

import { SKIP } from 'unist-util-visit';

import {
  transformTypeToReferenceLink,
  transformUnixManualToLink,
} from './transformers.mjs';
import { extractYamlContent, parseYAMLIntoMetadata } from './yaml.mjs';
import { lazy } from '../../../utils/misc.mjs';
import { QUERIES } from '../../../utils/queries/index.mjs';
import { getRemark } from '../../../utils/remark.mjs';
import { transformNodesToString } from '../../../utils/unist.mjs';

const remark = lazy(getRemark);
/**
 * Updates a Markdown link into a HTML link for API docs
 * @param {import('@types/mdast').Link} node A Markdown link node
 */
export const visitMarkdownLink = node => {
  node.url = node.url.replace(
    QUERIES.markdownUrl,
    (_, filename, hash = '') => `${filename}.html${hash}`
  );

  return [SKIP];
};

/**
 * Updates a reference
 * @param {import('@types/mdast').Text} node The current node
 * @param {import('@types/mdast').Parent} parent The parent node
 * @param {string|RegExp} query The search query
 * @param {Function} transformer The function to transform the reference
 */
const updateReferences = (query, transformer, node, parent) => {
  const replacedTypes = node.value
    .replace(query, transformer)
    // Remark doesn't handle leading / trailing spaces, so replace them with
    // HTML entities.
    .replace(/^\s/, '&nbsp;')
    .replace(/\s$/, '&nbsp;');

  // This changes the type into a link by splitting it up into several nodes,
  // and adding those nodes to the parent.
  const {
    children: [newNode],
  } = remark().parse(replacedTypes);

  // Find the index of the original node in the parent
  const index = parent.children.indexOf(node);

  // Replace the original node with the new node(s)
  parent.children.splice(index, 1, ...newNode.children);

  return [SKIP];
};

/**
 * Updates type references to be markdown links
 * @param {import('@types/mdast').Text} node The text node
 * @param {import('@types/mdast').Parent} parent The parent node
 * @param {Record<string, string>} typeMap The type mapping
 */
export const visitTextWithTypeNode = (node, parent, typeMap) =>
  updateReferences(
    QUERIES.normalizeTypes,
    type => transformTypeToReferenceLink(type, typeMap),
    node,
    parent
  );

/**
 * Updates unix manual references to be markdown links
 * @param {import('@types/mdast').Text} node The text node
 * @param {import('@types/mdast').Parent} parent The parent node
 */
export const visitTextWithUnixManualNode = (node, parent) =>
  updateReferences(
    QUERIES.unixManualPage,
    transformUnixManualToLink,
    node,
    parent
  );

/**
 * Updates a Markdown Link Reference into an actual Link to the Definition
 * @param {import('@types/mdast').LinkReference} node A link reference node
 * @param {Array<import('@types/mdast').Definition>} definitions The Definitions of the API Doc
 */
export const visitLinkReference = (node, definitions) => {
  const definition = definitions.find(
    ({ identifier }) => identifier === node.identifier
  );

  node.type = 'link';
  node.url = definition.url;

  return [SKIP];
};

/**
 * Parses a Stability Index Entry and updates the current Metadata
 * @param {import('@types/mdast').Blockquote} node The blockquote node
 * @param {import('../types').MetadataEntry} metadata The metadata object to update
 */
export const visitStability = (node, metadata) => {
  // `node` is a `blockquote` node, and the first child will always be
  // a `paragraph` node, so we can safely access the children of the first child
  // which we use as the prefix and description of the Stability Index
  const stabilityPrefix = transformNodesToString(node.children[0].children);

  // Attempts to grab the Stability index and description from the prefix
  const matches = QUERIES.stabilityIndex.exec(stabilityPrefix);

  // Ensures that the matches are valid and that we have at least 3 entries
  if (matches && matches.length === 3) {
    // Updates the `data` property of the Stability Index node
    // so that the original node data can also be inferred
    node.data = {
      // The 2nd match should be the group that matches the Stability Index
      index: matches[1],
      // The 3rd match should be the group containing all the remaining text
      // which is used as a description (we trim it to an one liner)
      description: matches[2].replace(/\n/g, ' ').trim(),
    };

    // Adds the Stability Index metadata to the current Metadata entry
    if (metadata) {
      metadata.stability = node;
    }
  }

  return [SKIP];
};

/**
 * Helper function to parse YAML from a node
 * @param {import('@types/mdast').Blockquote} node The blockquote node
 * @param {Object} metadata The metadata object to update
 */
export const visitYAML = (node, metadata) => {
  const yaml = extractYamlContent(node);
  const meta = parseYAMLIntoMetadata(yaml);

  Object.entries(meta).forEach(([key, value]) => {
    if (Array.isArray(metadata[key])) {
      return metadata[key].push(...value);
    }

    metadata[key] = value;
  });
};
