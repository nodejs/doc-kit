'use strict';

import { enforceArray } from '../../../../utils/array.mjs';
import { transformNodeToString } from '../../../../utils/unist.mjs';
import { ENTRY_TO_SECTION_TYPE } from '../../constants.mjs';

/**
 * @param {import('mdast').Heading} header
 * @param {number} depth
 * @returns {typeof ENTRY_TO_SECTION_TYPE[string]}
 */
function determineType(header) {
  const fallback = header.depth === 1 ? 'module' : 'text';

  // doc/api/process.md's parent section shouldn't have a defined type, but
  // it is defined as `global` for whatever reason
  if (
    header?.data.slug === 'process' &&
    header?.data.type === 'global' &&
    header?.data.depth === 1
  ) {
    return 'module';
  }

  return ENTRY_TO_SECTION_TYPE[header?.data.type ?? fallback];
}

/**
 * Adds a description to the section base.
 * @param {import('../../generated/generated.d.ts').SectionBase} section
 * @param {Array<import('mdast').RootContent>} nodes
 */
export function addDescriptionAndExamples(section, nodes) {
  nodes.forEach(node => {
    if (node.type === 'code') {
      if (section['@example']) {
        section['@example'] = [
          ...enforceArray(section['@example']),
          node.value,
        ];
      } else {
        section['@example'] = node.value;
      }
      const examples = [...enforceArray(section['@example']), node.value];
      section['@example'] = examples.length === 1 ? examples[0] : examples;
      return;
    }

    // Not code, let's stringify it and add it to the description.
    section.description ??= '';
    section.description += `${transformNodeToString(node)}${node.type === 'paragraph' ? '\n' : ' '}`;
  });

  section.description &&= section.description.trim();
}

/**
 * Adds the stability property to the section.
 * @param {import('../../generated/generated.d.ts').SectionBase} section
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry
 */
export function addStabilityStatus(section, entry) {
  const stability = entry.stability.children.map(node => node.data)?.[0];

  if (!stability) {
    return;
  }

  let { index, description } = stability;

  if (typeof index !== 'number') {
    index = Number(index);
  }

  section.stability = {
    index,
    description,
  };
}

/**
 * Adds the properties relating to versioning to the section.
 * @param {import('../../generated/generated.d.ts').SectionBase} section
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry
 */
export function addVersionProperties(section, entry) {
  if (entry.changes.length > 0) {
    section.changes = entry.changes.map(change => ({
      description: change.description,
      prUrl: change['pr-url'],
      version: enforceArray(change.version),
    }));
  }

  if (entry.added_in) {
    section['@since'] = enforceArray(entry.added_in);
  }

  if (entry.n_api_version) {
    section.napiVersion = enforceArray(entry.n_api_version);
  }

  if (entry.removed_in) {
    section.removedIn = enforceArray(entry.removed_in);
  }

  if (entry.deprecated_in) {
    section['@deprecated'] = enforceArray(entry.deprecated_in);
  }
}

/**
 * Returns an object containing the properties that can be found in every
 * section type that we have.
 *
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @returns {import('../../generated/generated.d.ts').SectionBase}
 */
export function createSectionBase(entry) {
  const [, ...nodes] = entry.content.children;

  const type = determineType(entry.heading);

  /**
   * @type {import('../../generated/generated.d.ts').SectionBase}
   */
  const base = {
    type,
    '@name': entry.heading.data.name,
  };

  addDescriptionAndExamples(base, nodes);
  addStabilityStatus(base, entry);
  addVersionProperties(base, entry);

  return base;
}
