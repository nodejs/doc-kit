'use strict';

import { GeneratorError } from '../../../utils/generator-error.mjs';
import { findParentSection } from './findParentSection.mjs';

/**
 * @typedef {import('../../legacy-json/types.d.ts').HierarchizedEntry} HierarchizedEntry
 */

export const createClassSectionBuilder = () => {
  /**
   * Adds the properties expected in a class section to an object.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Class} section The class section
   */
  return (entry, section) => {
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
