'use strict';

import { parseParameterList } from '../../../../utils/parseParameterList.mjs';
import { findParentSection } from '../findParentSection.mjs';

/**
 * Parse the parameters for the event's callback method
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Event} section The event section
 */
export function parseParameters(entry, section) {
  const [, ...nodes] = entry.content.children;
  const listNode = nodes[0];

  // If an event has type info it should be the first thing in its child
  // elements
  if (!listNode || listNode.type !== 'list') {
    // No parameters
    return;
  }

  const parameters = parseParameterList(listNode);

  section.parameters = parameters.map(({ name, type, description }) => ({
    '@name': name,
    '@type': type.length === 1 ? type[0] : type,
    description,
  }));
}

/**
 * Adds the properties expected in an event section to an object.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Event} section The event section
 */
export function createEventSection(entry, section) {
  parseParameters(entry, section);

  const parent = findParentSection(section, ['class', 'module']);

  // Add this section to the parent if it exists
  if (parent) {
    parent.events ??= [];
    parent.events.push(section);
  }
}
