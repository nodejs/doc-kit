'use strict';

import getConfig from '#core/utils/configuration/index.mjs';
import {
  GITHUB_BLOB_URL,
  populate,
} from '#core/utils/configuration/templates.mjs';
import { QUERIES, UNIST } from '#core/utils/queries/index.mjs';
import { h as createElement } from 'hastscript';
import { u as createTree } from 'unist-builder';
import { SKIP, visit } from 'unist-util-visit';

/**
 * Creates a stateful slugger for legacy anchor links.
 *
 * Generates underscore-separated slugs in the form `{apiStem}_{text}`,
 * appending `_{n}` for duplicates to preserve historical anchor compatibility.
 *
 * @returns {(text: string, apiStem: string) => string}
 */
export const createLegacySlugger =
  (counters = {}) =>
  (text, apiStem) => {
    const id = `${apiStem}_${text}`
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^\d/, '_$&');

    counters[id] ??= -1;
    const count = ++counters[id];
    return count > 0 ? `${id}_${count}` : id;
  };

/**
 * Generates the Stability Overview table based on the API metadata nodes.
 *
 * @param {Array<import('../../../metadata/types').MetadataEntry>} headMetadata The API metadata nodes to be used for the Stability Overview
 */
export const buildStabilityOverview = headMetadata => {
  const headNodesWithStability = headMetadata.filter(entry => entry.stability);

  const mappedHeadNodesIntoTable = headNodesWithStability.map(
    ({ heading, api, stability }) => {
      return createElement(
        'tr',
        createElement(
          'td.module_stability',
          createElement('a', { href: `${api}.html` }, heading.data.name)
        ),
        createElement(
          `td.api_stability.api_stability_${parseInt(stability.data.index)}`,
          // Grabs the first sentence of the description
          // to be used as a summary of the Stability Index
          `(${stability.data.index}) ${stability.data.description.split('. ')[0]}`
        )
      );
    }
  );

  return createElement(
    'table',
    createElement(
      'thead',
      createElement(
        'tr',
        createElement('th', 'API'),
        createElement('th', 'Stability')
      )
    ),
    createElement('tbody', mappedHeadNodesIntoTable)
  );
};

/**
 * Generates extra "special" HTML content based on extra metadata that a node may have.
 *
 * @param {Array<import('../../../metadata/types').MetadataEntry>} headNodes The API metadata nodes to be used for the Stability Overview
 * @param {import('../../../metadata/types').MetadataEntry} node The current API metadata node to be transformed into HTML content
 * @returns {import('unist').Parent} The HTML AST tree for the extra content
 */
const buildExtraContent = (headNodes, node) => {
  return createTree('root', [
    (node.tags ?? []).map(tag => {
      switch (tag) {
        case 'STABILITY_OVERVIEW_SLOT_BEGIN':
          return buildStabilityOverview(headNodes);
        case 'STABILITY_OVERVIEW_SLOT_END':
          return createTree('root');
        default:
          return createTree('root');
      }
    }),
  ]);
};

/**
 * Builds a Markdown heading for a given node
 *
 * @param {import('../../../metadata/types').HeadingNode} node The node to build the Markdown heading for
 * @param {number} index The index of the current node
 * @param {import('unist').Parent} parent The parent node of the current node
 * @returns {import('hast').Element} The HTML AST tree of the heading content
 */
const buildHeading = ({ data, children, depth }, index, parent, legacySlug) => {
  // Creates the heading element with the heading text and the link to the heading
  const headingElement = createElement(`h${depth + 1}`, [
    // The inner Heading markdown content is still using Remark nodes, and they need
    // to be converted into Rehype nodes
    ...children,
    // Legacy anchor alias to preserve old external links
    createElement('span', createElement(`a#${legacySlug}`)),
    // Creates the element that references the link to the heading
    // (The `#` anchor on the right of each Heading section)
    createElement(
      'span',
      createElement(`a.mark#${data.slug}`, { href: `#${data.slug}` }, '#')
    ),
  ]);

  // Removes the original Heading node from the content tree
  parent.children.splice(index, 1);

  // Adds the new Heading element to the top of the content tree
  // since the heading is the first element of the content
  // We also ensure a node is only created if it is a valid Heading
  if (data.name && data.slug && children.length) {
    parent.children.unshift(headingElement);
  }
};

/**
 * Builds an HTML Stability element
 *
 * @param {import('../../../metadata/types').StabilityNode} node The HTML AST tree of the Stability Index content
 * @param {number} index The index of the current node
 * @param {import('unist').Parent} parent The parent node of the current node
 */
const buildStability = ({ children, data }, index, parent) => {
  const stabilityElement = createElement(
    // Creates the `div` element with the class `api_stability` and the stability index class
    // FYI: Since the Stability Index `blockquote` node gets modified within `queries.mjs`
    // it contains the StabilityIndexMetadataEntry within the `data` property
    `div.api_stability.api_stability_${parseInt(data.index)}`,
    // Processed the Markdown nodes into HTML nodes
    children
  );

  // Replaces the Stability Index `blockquote` node with the new Stability Index element
  parent.children.splice(index, 1, stabilityElement);

  return [SKIP];
};

/**
 * Transforms the node Markdown link into an HTML link
 *
 * @param {import('@types/mdast').Html} node The node containing the HTML content
 */
export const buildHtmlTypeLink = node => {
  node.value = node.value.replace(
    QUERIES.linksWithTypes,
    (_, type, link) => `<a href="${link}" class="type">&lt;${type}&gt;</a>`
  );
};

/**
 * Creates a history table row.
 *
 * @param {import('../../../metadata/types').ChangeEntry} change
 * @param {import('unified').Processor} remark
 */
export const createHistoryTableRow = (
  { version: changeVersions, description },
  remark
) => {
  const descriptionNode = remark.parse(description);

  return createElement('tr', [
    createElement(
      'td',
      Array.isArray(changeVersions) ? changeVersions.join(', ') : changeVersions
    ),
    createElement('td', descriptionNode),
  ]);
};

/**
 * Builds the Metadata Properties into content
 *
 * @param {import('../../../metadata/types').MetadataEntry} node The node to build the properties from
 * @param {import('unified').Processor} remark The Remark instance to be used to process changes table
 * @returns {import('unist').Parent} The HTML AST tree of the properties content
 */
export const buildMetadataElement = (node, remark) => {
  const config = getConfig('legacy-html');
  const metadataElement = createElement('div.api_metadata');

  // We use a `span` element to display the source link as a clickable link to the source within Node.js
  if (typeof node.source_link === 'string') {
    // Creates the source link URL with the base URL and the source link
    const sourceLink = `${populate(GITHUB_BLOB_URL, config)}${node.source_link}`;
    metadataElement.children.push(
      // Creates the source link element with the source link and the source link text
      createElement('span', [
        createElement('b', 'Source Code: '),
        createElement('a', { href: sourceLink }, node.source_link),
      ])
    );
  }

  // We use a `span` element to display the added in version
  if (typeof node.added !== 'undefined') {
    const addedIn = Array.isArray(node.added)
      ? node.added.join(', ')
      : node.added;
    // Creates the added in element with the added in version
    metadataElement.children.push(
      createElement('span', ['Added in: ', addedIn])
    );
  }

  // We use a `span` element to display the deprecated in version
  if (typeof node.deprecated !== 'undefined') {
    const deprecatedIn = Array.isArray(node.deprecated)
      ? node.deprecated.join(', ')
      : node.deprecated;
    // Creates the deprecated in element with the deprecated in version
    metadataElement.children.push(
      createElement('span', ['Deprecated in: ', deprecatedIn])
    );
  }

  // We use a `span` element to display the removed in version
  if (typeof node.removed !== 'undefined') {
    const removedIn = Array.isArray(node.removed)
      ? node.removed.join(', ')
      : node.removed;
    // Creates the removed in element with the removed in version
    metadataElement.children.push(
      createElement('span', ['Removed in: ', removedIn])
    );
  }

  // We use a `span` element to display the N-API version if it is available
  if (typeof node.napiVersion === 'number') {
    // Creates the N-API version element with the N-API version
    metadataElement.children.push(
      createElement('span', [
        createElement('b', 'N-API Version: '),
        node.napiVersion,
      ])
    );
  }

  // If there are changes, we create a `details` element with a `table` element to display the changes
  // Differently from the old API docs, on this version we always enforce a table to display the changes
  if (typeof node.changes !== 'undefined' && node.changes.length) {
    // Maps the changes into a `tr` element with the version and the description
    // An array containing hast nodes for the history entries if any
    const historyEntries = node.changes.map(change =>
      createHistoryTableRow(change, remark)
    );

    metadataElement.children.push(
      createElement('details.changelog', [
        createElement('summary', 'History'),
        createElement('table', [
          createElement('thead', [
            createElement('tr', [
              createElement('th', 'Version'),
              createElement('th', 'Changes'),
            ]),
          ]),
          createElement('tbody', historyEntries),
        ]),
      ])
    );
  }

  // Parses and processes the mixed Markdown/HTML content into an HTML AST tree
  return metadataElement;
};

/**
 * Builds the whole content of a given node (API module)
 *
 * @param {Array<import('../../../metadata/types').MetadataEntry>} headNodes The API metadata Nodes that are considered the "head" of each module
 * @param {Array<import('../../../metadata/types').MetadataEntry>} metadataEntries The API metadata Nodes to be transformed into HTML content
 * @param {import('unified').Processor} remark The Remark instance to be used to process
 */
const buildContent = (headNodes, metadataEntries, remark) => {
  const getLegacySlug = createLegacySlugger();

  // Creates the root node for the content
  const parsedNodes = createTree(
    'root',
    // Parses the metadata pieces of each node and the content
    metadataEntries.map(entry => {
      // Deep clones the content nodes to avoid affecting upstream nodes
      const content = structuredClone(entry.content);

      // Parses the Heading nodes into Heading elements
      visit(content, UNIST.isHeading, (node, index, parent) =>
        buildHeading(
          node,
          index,
          parent,
          getLegacySlug(node.data.text, entry.api)
        )
      );

      // Parses the Blockquotes into Stability elements
      // This is treated differently as we want to preserve the position of a Stability Index
      // within the content, so we can't just remove it and append it to the metadata
      visit(content, UNIST.isStabilityNode, buildStability);

      // Parses the type references that got replaced into Markdown links (raw)
      // into actual HTML links, these then get parsed into HAST nodes on `runSync`
      visit(content, UNIST.isHtmlWithType, buildHtmlTypeLink);

      // Splits the content into the Heading node and the rest of the content
      const [headingNode, ...restNodes] = content.children;

      // Concatenates all the strings and parses with remark into an AST tree
      return createElement('section', [
        headingNode,
        buildMetadataElement(entry, remark),
        buildExtraContent(headNodes, entry),
        ...restNodes,
      ]);
    })
  );

  const processedNodes = remark.runSync(parsedNodes);

  // Stringifies the processed nodes to return the final Markdown content
  return remark.stringify(processedNodes);
};

export default buildContent;
