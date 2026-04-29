'use strict';

import { h as createElement } from 'hastscript';

import { createSyntheticHead, wrapAsEntry } from './synthetic.mjs';

/**
 * Builds the Stability Overview table from module heads that declare a
 * top-level stability index, mirroring the `legacy-html-all` overview.
 *
 * @param {Array<import('../../../metadata/types').MetadataEntry>} headEntries
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
            `(${stability.data.index}) ${stability.data.description.split('. ')[0]}`
          ),
        ])
      )
    ),
  ]);

/**
 * Builds the page descriptor for `index.html`
 *
 * @param {Array<import('../../../metadata/types').MetadataEntry>} entries
 */
export const buildIndexPage = entries => {
  const head = createSyntheticHead('index', 'Index');
  const moduleEntries = entries.filter(entry => entry.heading.depth === 1);

  return {
    head,
    entries: [
      wrapAsEntry(head, [
        buildStabilityOverview(moduleEntries.filter(entry => entry.stability)),
      ]),
    ],
  };
};
