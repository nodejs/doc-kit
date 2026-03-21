'use strict';

import { OVERRIDDEN_POSITIONS } from '../constants.mjs';

/**
 * Sorts entries by OVERRIDDEN_POSITIONS and then heading name.
 * @param {import('../../metadata/types').MetadataEntry} a
 * @param {import('../../metadata/types').MetadataEntry} b
 * @returns {number}
 */
const headingSortFn = (a, b) => {
  const ai = OVERRIDDEN_POSITIONS.indexOf(a.api);
  const bi = OVERRIDDEN_POSITIONS.indexOf(b.api);

  if (ai !== -1 && bi !== -1) {
    return ai - bi;
  }

  if (ai !== -1) {
    return -1;
  }

  if (bi !== -1) {
    return 1;
  }

  return a.heading.data.name.localeCompare(b.heading.data.name);
};

/**
 * Filters and sorts entries by OVERRIDDEN_POSITIONS and then heading name.
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries
 * @returns {Array<import('../../metadata/types').MetadataEntry>}
 */
export const getSortedHeadNodes = entries =>
  entries.filter(node => node.heading.depth === 1).toSorted(headingSortFn);
