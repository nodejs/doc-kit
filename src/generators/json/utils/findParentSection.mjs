'use strict';

import { enforceArray } from '../../../utils/array.mjs';

/**
 * Finds the closest parent section with the specified type(s).
 * @param {import('../types.d.ts').Section} section
 * @param {import('../generated.d.ts').SectionBase['type'] | Array<import('../generated.d.ts').SectionBase['type']>} type
 * @returns {import('../types.d.ts').Section | undefined}
 */
export function findParentSection(section, type) {
  type = enforceArray(type);

  let parent = section.parent;

  while (parent) {
    if (type.includes(parent.type)) {
      return parent;
    }

    parent = parent.parent;
  }

  return undefined;
}
