'use strict';

import { h as createElement } from 'hastscript';

import { createJSXElement } from './ast.mjs';
import { getSortedHeadNodes } from './getSortedHeadNodes.mjs';
import { JSX_IMPORTS } from '../../html/constants.mjs';

// The metadata parser turns bare HTML comments into entry tags, so a
// `<!-- DOCUMENTATION_INDEX -->` comment in a source document surfaces as
// this tag on the entry for the section containing it.
export const DOCUMENTATION_INDEX_TAG = 'DOCUMENTATION_INDEX';

const STABILITY_BADGE_KINDS = [
  'error',
  'warning',
  'default',
  'info',
  'neutral',
  'neutral',
];

/**
 * Maps a Node.js stability index to a UI badge kind.
 *
 * @param {string} index
 */
const getStabilityBadgeKind = index =>
  STABILITY_BADGE_KINDS[parseInt(index, 10)] ?? 'neutral';

/**
 * Builds the Stability Overview table from module heads that declare a
 * top-level stability index, mirroring the `legacy-html-all` overview.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} headEntries
 */
export const buildStabilityOverview = headEntries =>
  createElement('table', [
    createElement('thead', [
      createElement('tr', [
        createElement('th', 'API'),
        createElement('th', 'Stability'),
      ]),
    ]),
    createElement(
      'tbody',
      headEntries.map(({ heading, api, stability }) =>
        createElement('tr', [
          createElement(
            'td',
            createElement('a', { href: `${api}.html` }, heading.data.name)
          ),
          createElement(
            'td',
            createJSXElement(JSX_IMPORTS.Badge.name, {
              size: 'small',
              kind: getStabilityBadgeKind(stability.data.index),
              'aria-label': `Stability: ${stability.data.index}`,
              children: stability.data.index,
            }),
            ` ${stability.data.description.split('. ')[0]}`
          ),
        ])
      )
    ),
  ]);

/**
 * Places the Stability Overview into every entry whose source section
 * contains a `<!-- DOCUMENTATION_INDEX -->` comment. The parser strips the
 * comment itself, so the table lands at the end of the tagged section.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries - Entries to scan for the tag
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} moduleEntries - Entries providing the module heads for the overview
 */
export const injectDocumentationIndex = (entries, moduleEntries) => {
  const headEntries = getSortedHeadNodes(moduleEntries).filter(
    entry => entry.stability
  );

  for (const entry of entries) {
    if (entry.tags?.includes(DOCUMENTATION_INDEX_TAG)) {
      entry.content.children.push(buildStabilityOverview(headEntries));
    }
  }
};
