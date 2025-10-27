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
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Class} section The class section
   */
  return (entry, section) => {
    // TODO we could go with lazy creating these
    section['@constructor'] = [];

    section.methods = [];

    section.staticMethods = [];

    section.properties = [];

    section.events = [];

    const parent = findParentSection(section, 'module');

    if (parent) {
      if (!Array.isArray(parent.classes)) {
        throw new GeneratorError(
          `expected parent.classes to be an array, got ${typeof parent.classes}`,
          { entry }
        );
      }

      parent.classes.push(section);
    }
  };
};
