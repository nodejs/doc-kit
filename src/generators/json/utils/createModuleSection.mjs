'use strict';

import { DOC_NODE_VERSION } from '../../../constants.mjs';

/**
 * @typedef {import('../../../utils/buildHierarchy.mjs').HierarchizedEntry} HierarchizedEntry
 */

/**
 *
 */
export const createModuleSectionBuilder = () => {
  /**
   * Adds the properties expected in a module section to an object.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Module} section The module section
   */
  return (entry, section) => {
    section['@see'] =
      `https://nodejs.org/docs/${DOC_NODE_VERSION}/api/${entry.api}.html`;

    section['@module'] = `node:${entry.api}`;
  };
};
