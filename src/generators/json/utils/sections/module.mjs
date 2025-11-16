'use strict';

import { BASE_URL, DOC_NODE_VERSION } from '../../../../constants.mjs';

/**
 * Adds the properties expected in a module section to an object.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated.d.ts').Module} section The module section
 */
export function createModuleSection(entry, section) {
  section['@see'] = `${BASE_URL}docs/${DOC_NODE_VERSION}/api/${entry.api}.html`;

  section['@module'] = `node:${entry.api}`;
}
