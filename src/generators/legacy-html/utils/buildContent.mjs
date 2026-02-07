'use strict';

import { h as createElement } from 'hastscript';
import { u as createTree } from 'unist-builder';
import { SKIP, visit } from 'unist-util-visit';

import buildExtraContent from './buildExtraContent.mjs';
import getConfig from '../../../utils/configuration/index.mjs';
import {
  GITHUB_BLOB_URL,
  populate,
} from '../../../utils/configuration/templates.mjs';
import createQueries from '../../../utils/queries/index.mjs';

/**
 * Builds a Markdown heading for a given node
 *
 * @param {ApiDocMetadataEntry['heading']} node The node to build the Markdown heading for
 * @param {number} index The index of the current node
 * @param {import('unist').Parent} parent The parent node of the current node
 * @returns {import('hast').Element} The HTML AST tree of the heading content
 */
const buildHeading = ({ data, children }, index, parent) => {
  // Creates the heading element with the heading text and the link to the heading
  const headingElement = createElement(`h${data.depth + 1}`, [
    // The inner Heading markdown content is still using Remark nodes, and they need
    // to be converted into Rehype nodes
    ...children,
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
 * @param {import('@types/mdast').Blockquote} node The HTML AST tree of the Stability Index content
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
const buildHtmlTypeLink = node => {
  node.value = node.value.replace(
    createQueries.QUERIES.linksWithTypes,
    (_, type, link) => `<a href="${link}" class="type">&lt;${type}&gt;</a>`
  );
};

/**
 * Creates a history table row.
 *
 * @param {ApiDocMetadataChange} change
 * @param {import('unified').Processor} remark
 */
const createHistoryTableRow = (
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
 * @param {ApiDocMetadataEntry} node The node to build the properties from
 * @param {import('unified').Processor} remark The Remark instance to be used to process changes table
 * @returns {import('unist').Parent} The HTML AST tree of the properties content
 */
const buildMetadataElement = (node, remark) => {
  const config = getConfig('legacy-html');

  const metadataElement = createElement('div.api_metadata');

  // We use a `span` element to display the source link as a clickable link to the source within Node.js
  if (typeof node.source_link === 'string') {
    // Creates the source link URL with the base URL and the source link
    const sourceLink = `${populate(GITHUB_BLOB_URL, config)}${node.source_link}`;

    // Creates the source link element with the source link and the source link text
    const sourceLinkElement = createElement('span', [
      createElement('b', 'Source Code: '),
      createElement('a', { href: sourceLink }, node.source_link),
    ]);

    // Appends the source link element to the metadata element
    metadataElement.children.push(sourceLinkElement);
  }

  // We use a `span` element to display the added in version
  if (typeof node.added_in !== 'undefined') {
    const addedIn = Array.isArray(node.added_in)
      ? node.added_in.join(', ')
      : node.added_in;

    // Creates the added in element with the added in version
    const addedinElement = createElement('span', ['Added in: ', addedIn]);

    // Appends the added in element to the metadata element
    metadataElement.children.push(addedinElement);
  }

  // We use a `span` element to display the deprecated in version
  if (typeof node.deprecated_in !== 'undefined') {
    const deprecatedIn = Array.isArray(node.deprecated_in)
      ? node.deprecated_in.join(', ')
      : node.deprecated_in;

    // Creates the deprecated in element with the deprecated in version
    const deprecatedInElement = createElement('span', [
      'Deprecated in: ',
      deprecatedIn,
    ]);

    // Appends the deprecated in element to the metadata element
    metadataElement.children.push(deprecatedInElement);
  }

  // We use a `span` element to display the removed in version
  if (typeof node.removed_in !== 'undefined') {
    const removedIn = Array.isArray(node.removed_in)
      ? node.removed_in.join(', ')
      : node.removed_in;

    // Creates the removed in element with the removed in version
    const removedInElement = createElement('span', ['Removed in: ', removedIn]);

    // Appends the removed in element to the metadata element
    metadataElement.children.push(removedInElement);
  }

  // We use a `span` element to display the N-API version if it is available
  if (typeof node.n_api_version === 'number') {
    // Creates the N-API version element with the N-API version
    const nApiVersionElement = createElement('span', [
      createElement('b', 'N-API Version: '),
      node.n_api_version,
    ]);

    // Appends the source n-api element to the metadata element
    metadataElement.children.push(nApiVersionElement);
  }

  // If there are changes, we create a `details` element with a `table` element to display the changes
  // Differently from the old API docs, on this version we always enforce a table to display the changes
  if (typeof node.changes !== 'undefined' && node.changes.length) {
    // Maps the changes into a `tr` element with the version and the description
    // An array containing hast nodes for the history entries if any
    const historyEntries = node.changes.map(change =>
      createHistoryTableRow(change, remark)
    );

    const historyDetailsElement = createElement('details.changelog', [
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
    ]);

    // Appends the history details element to the metadata element
    metadataElement.children.push(historyDetailsElement);
  }

  // Parses and processes the mixed Markdown/HTML content into an HTML AST tree
  return metadataElement;
};

/**
 * Builds the whole content of a given node (API module)
 *
 * @param {Array<ApiDocMetadataEntry>} headNodes The API metadata Nodes that are considered the "head" of each module
 * @param {Array<ApiDocMetadataEntry>} metadataEntries The API metadata Nodes to be transformed into HTML content
 * @param {import('unified').Processor} remark The Remark instance to be used to process
 */
export default (headNodes, metadataEntries, remark) => {
  // Creates the root node for the content
  const parsedNodes = createTree(
    'root',
    // Parses the metadata pieces of each node and the content
    metadataEntries.map(entry => {
      // Deep clones the content nodes to avoid affecting upstream nodes
      const content = structuredClone(entry.content);

      // Parses the Heading nodes into Heading elements
      visit(content, createQueries.UNIST.isHeading, buildHeading);

      // Parses the Blockquotes into Stability elements
      // This is treated differently as we want to preserve the position of a Stability Index
      // within the content, so we can't just remove it and append it to the metadata
      visit(content, createQueries.UNIST.isStabilityNode, buildStability);

      // Parses the type references that got replaced into Markdown links (raw)
      // into actual HTML links, these then get parsed into HAST nodes on `runSync`
      visit(content, createQueries.UNIST.isHtmlWithType, buildHtmlTypeLink);

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
