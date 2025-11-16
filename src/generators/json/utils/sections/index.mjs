'use strict';

import { createSectionBase } from './base.mjs';
import { createClassSection } from './class.mjs';
import { createEventSection } from './event.mjs';
import { createMethodSection } from './method.mjs';
import { createModuleSection } from './module.mjs';
import { createPropertySection } from './property.mjs';
import { BASE_URL, DOC_NODE_VERSION } from '../../../../constants.mjs';
import { buildHierarchy } from '../../../../utils/buildHierarchy.mjs';
import { GeneratorError } from '../../../../utils/generator-error.mjs';

/**
 * Processes children of a given entry and updates the section.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry - The current entry.
 * @param {import('../../types.d.ts').Section | undefined} parent
 */
const handleChildren = ({ hierarchyChildren }, parent) =>
  hierarchyChildren?.forEach(child => createSectionProperties(child, parent));

/**
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry
 * @param {import('../../types.d.ts').Section | undefined} parent
 * @returns {import('../../types.d.ts').Section}
 */
function createSectionProperties(entry, parent) {
  /**
   * @type {import('../../types.d.ts').Section}
   */
  let section;
  try {
    section = createSectionBase(entry, parent?.type);

    // Temporarily add the parent section to the section so we have access to
    //  it and can easily traverse through them when we need to
    section.parent = parent;

    switch (section.type) {
      case 'module':
        createModuleSection(entry, section);
        break;
      case 'class':
        createClassSection(section);
        break;
      case 'method':
        createMethodSection(entry, section);
        break;
      case 'property':
        createPropertySection(entry, section);
        break;
      case 'event':
        createEventSection(entry, section);
        break;
      case 'text':
        if (parent) {
          parent.text ??= [];
          parent.text.push(section);
        }

        break;
      default:
        throw new GeneratorError(`unhandled section type ${section.type}`);
    }
  } catch (err) {
    if (err instanceof GeneratorError) {
      err.entry ??= entry;
    }

    throw err;
  }

  handleChildren(entry, section);

  // Remove the parent property we added to the section earlier
  delete section.parent;

  return section;
}

/**
 * Builds the module section from head metadata and entries.
 * @param {ApiDocMetadataEntry} head The head metadata entry
 * @param {Array<ApiDocMetadataEntry>} entries The list of metadata entries
 * @returns {import('../../generated.d.ts').NodeJsAPIDocumentationSchema}
 */
export function createSection(head, entries) {
  const entryHierarchy = buildHierarchy(entries);

  if (entryHierarchy.length != 1) {
    throw new TypeError(`${head.api_doc_source} has multiple root elements`);
  }

  const section = createSectionProperties(entryHierarchy[0], undefined);

  if (section.type !== 'module' && section.type !== 'text') {
    throw new GeneratorError(
      `expected root section to be a module or text, got ${section.type}`,
      { entry: head }
    );
  }

  return {
    $schema: `${BASE_URL}/docs/${DOC_NODE_VERSION}/api/node-doc-schema.json`,
    source: head.api_doc_source,
    ...section,
  };
}
