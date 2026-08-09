'use strict';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';

import { createSyntheticHead, wrapAsEntry } from './synthetic.mjs';
import { JSX_IMPORTS } from '../../../html/constants.mjs';
import { createJSXElement } from '../ast.mjs';
import { getSortedHeadNodes } from '../getSortedHeadNodes.mjs';

/**
 * Maps the sorted module heads to the plain props consumed by the `IndexPage`
 * component: display name, page href, and numeric stability index (defaulting
 * to stable, mirroring the ToC).
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} headEntries
 */
export const buildModuleProps = headEntries =>
  headEntries.map(({ heading, api, stability }) => ({
    name: heading.data.name,
    href: `${api}.html`,
    stability: parseInt(stability?.data.index ?? '2', 10),
  }));

/**
 * Builds the page descriptor for `index.html`
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries
 */
export const buildIndexPage = entries => {
  const config = getConfig('jsx-ast');
  const head = createSyntheticHead(
    'index',
    `${config.project} Documentation Index`
  );

  return {
    head,
    entries: [
      wrapAsEntry(head, [
        createJSXElement(JSX_IMPORTS.IndexPage.name, {
          inline: false,
          modules: buildModuleProps(getSortedHeadNodes(entries)),
        }),
      ]),
    ],
  };
};
