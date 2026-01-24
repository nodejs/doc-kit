'use strict';

import { BASE_URL } from '../../../../constants.mjs';

/**
 * Adds the properties expected in a module section to an object.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Module} section The module section
 * @param {string} version
 */
export function createModuleSection(entry, section, version) {
  section['@see'] = `${BASE_URL}docs/${version}/api/${entry.api}.html`;

  section['@module'] = `node:${entry.api}`;
}
