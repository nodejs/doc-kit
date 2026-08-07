'use strict';

import { createSyntheticHead } from './synthetic.mjs';

/**
 * Builds the page descriptor for `all.html`
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries
 */
export const buildAllPage = entries => ({
  head: createSyntheticHead('all', 'All'),
  entries,
});
