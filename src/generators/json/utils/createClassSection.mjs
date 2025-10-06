'use strict';

import { findParentSection } from './findParentSection.mjs';
import { GeneratorError } from '../../../utils/generator-error.mjs';

/**
 * @typedef {import('../../../utils/buildHierarchy.mjs').HierarchizedEntry} HierarchizedEntry
 */

/**
 *
 */
export const createClassSectionBuilder = () => {
  /**
   * Adds the properties expected in a class section to an object.
   * @param {HierarchizedEntry} _ The AST entry
   * @param {import('../generated.d.ts').Class} section The class section
   */
  return (_, section) => {
    const parent = findParentSection(section, 'module');

    if (parent) {
      parent.classes ??= [];
      parent.classes.push(section);
    }
  };
};
