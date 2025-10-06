'use strict';

import { findParentSection } from '../findParentSection.mjs';

/**
 * Adds the properties expected in a class section to an object.
 * @param {import('../../generated.d.ts').Class} section The class section
 */
export function createClassSection(section) {
  const parent = findParentSection(section, 'module');

  if (parent) {
    parent.classes ??= [];
    parent.classes.push(section);
  }
}
