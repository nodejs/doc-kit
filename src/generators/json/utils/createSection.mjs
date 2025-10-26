'use strict';

import { buildHierarchy } from '../../../utils/buildHierarchy.mjs';
import { createSectionBaseBuilder } from './createSectionBase.mjs';
import { createModuleSectionBuilder } from './createModuleSection.mjs';
import { createClassSectionBuilder } from './createClassSection.mjs';
import { createMethodSectionBuilder } from './createMethodSection.mjs';
import { createPropertySectionBuilder } from './createPropertySection.mjs';
import { createEventSectionBuilder } from './createEventSection.mjs';
import { GeneratorError } from '../../../utils/generator-error.mjs';
import { DOC_NODE_VERSION } from '../../../constants.mjs';

/**
 * @typedef {import('../../../utils/buildHierarchy.mjs').HierarchizedEntry} HierarchizedEntry
 */

export const createSectionBuilder = () => {
  const createSectionBase = createSectionBaseBuilder();
  const createModuleSection = createModuleSectionBuilder();
  const createClassSection = createClassSectionBuilder();
  const createMethodSection = createMethodSectionBuilder();
  const createPropertySection = createPropertySectionBuilder();
  const createEventSection = createEventSectionBuilder();

  /**
   * Creates the properties that exist in the root of a document
   * @param {ApiDocMetadataEntry} head The head metadata entry
   * @returns {import('../generated.d.ts').DocumentRoot}
   */
  const createDocumentRoot = head => {
    return {
      source: head.api_doc_source,
    };
  };

  /**
   * Processes children of a given entry and updates the section.
   * @param {HierarchizedEntry} entry - The current entry.
   * @param {import('../types.d.ts').Section | undefined} parent
   */
  const handleChildren = ({ hierarchyChildren }, parent) =>
    hierarchyChildren?.forEach(child => createSection(child, parent));

  /**
   * @param {HierarchizedEntry} entry
   * @param {import('../types.d.ts').Section | undefined} parent
   * @returns {import('../types.d.ts').Section}
   */
  const createSection = (entry, parent) => {
    /**
     * @type {import('../types.d.ts').Section}
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
          createClassSection(entry, section);
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
  };

  /**
   * Builds the module section from head metadata and entries.
   * @param {ApiDocMetadataEntry} head The head metadata entry
   * @param {Array<ApiDocMetadataEntry>} entries The list of metadata entries
   * @returns {import('../generated.d.ts').NodeJsAPIDocumentationSchema}
   */
  return (head, entries) => {
    const entryHierarchy = buildHierarchy(entries);

    if (entryHierarchy.length != 1) {
      throw new TypeError(`${head.api_doc_source} has multiple root elements`);
    }

    const documentRoot = createDocumentRoot(head);

    const section = createSection(entryHierarchy[0], undefined);

    if (section.type !== 'module' && section.type !== 'text') {
      throw new GeneratorError(
        `expected root section to be a module or text, got ${section.type}`,
        { entry: head }
      );
    }

    return {
      $schema: `https://nodejs.org/doc/${DOC_NODE_VERSION}/api/node-doc-schema.json`,
      ...documentRoot,
      ...section,
    };
  };
};
