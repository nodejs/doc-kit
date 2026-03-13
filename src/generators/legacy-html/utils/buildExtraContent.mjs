'use strict';

import { h as createElement } from 'hastscript';
import { u as createTree } from 'unist-builder';

/**
 * Generates the Stability Overview table based on the API metadata nodes.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} headMetadata The API metadata nodes to be used for the Stability Overview
 */
const buildStabilityOverview = headMetadata => {
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
 * @param {Array<import('../../metadata/types').MetadataEntry>} headNodes The API metadata nodes to be used for the Stability Overview
 * @param {import('../../metadata/types').MetadataEntry} node The current API metadata node to be transformed into HTML content
 * @returns {import('unist').Parent} The HTML AST tree for the extra content
 */
export default (headNodes, node) => {
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
