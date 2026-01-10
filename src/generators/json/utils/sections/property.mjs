'use strict';

import { parseParameterList } from '../../../../utils/parseParameterList.mjs';
import { findParentSection } from '../findParentSection.mjs';

/**
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Property} section The method section
 */
function parseTypeAndDescription(entry, section) {
  const [typeInfo] = parseParameterList(entry);

  if (!typeInfo) {
    // No type info
    section['@type'] = 'any';
    return;
  }

  section['@type'] =
    typeInfo.type.length === 1 ? typeInfo.type[0] : typeInfo.type;

  if (typeInfo.description) {
    // TODO probably need spaces here
    section.description += typeInfo.description;
  }
}

/**
 * Adds the properties expected in a method section to an object.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Property} section The method section
 */
export function createPropertySection(entry, section) {
  parseTypeAndDescription(entry, section);

  const parent = findParentSection(section, ['class', 'module']);

  // Add this section to the parent if it exists
  if (parent) {
    parent.properties ??= [];
    parent.properties.push(section);
  }
}
