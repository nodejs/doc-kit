// @ts-check
'use strict';

import { enforceArray } from '../../../utils/array.mjs';

/**
 * @typedef {import('../../legacy-json/types.d.ts').HierarchizedEntry} HierarchizedEntry
 */

/**
 * Mapping of {@link HeadingMetadataEntry['type']} to types defined in the
 * JSON schema.
 *
 * Exported for tests.
 */
export const ENTRY_TO_SECTION_TYPE = /** @type {const} */ ({
  var: 'property',
  global: 'property',
  module: 'module',
  class: 'class',
  ctor: 'method',
  method: 'method',
  classMethod: 'method',
  property: 'property',
  event: 'event',
  misc: 'text',
  text: 'text',
  example: 'text',
});

export const createSectionBaseBuilder = () => {
  /**
   * @param {import('mdast').Heading} header
   * @param {number} depth
   * @returns {typeof ENTRY_TO_SECTION_TYPE[string]}
   */
  const determineType = (header, entry) => {
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

    // if (header?.data.type === 'global') {
    //   console.log(entry);
    // }

    return ENTRY_TO_SECTION_TYPE[header?.data.type ?? fallback];
  };

  /**
   * Adds a description to the section base.
   * @param {import('../generated.d.ts').SectionBase} section
   * @param {Array<import('mdast').RootContent>} nodes
   */
  const addDescriptionAndExamples = (section, nodes) => {
    nodes.forEach(node => {
      /**
       * @type {string | undefined}
       */
      let content;

      switch (node.type) {
        case 'paragraph': {
          addDescriptionAndExamples(section, node.children);
          section.description += ' ';
          break;
        }
        case 'emphasis': {
          addDescriptionAndExamples(section, node.children);
          break;
        }
        case 'inlineCode': {
          content = `\`${node.value}\` `;
          break;
        }
        case 'text': {
          // This is untrimmed so should have a trailing space if one is needed
          content = node.value;
          break;
        }
        case 'link': {
          if (node.label) {
            // Standard link to some resource
            content = `[${node.label}](${node.url})`;
          } else {
            // Missing the label, let's see if it's a reference to a global
            const childNode = node.children[0];

            // todo stringify this properly

            if (
              childNode &&
              (childNode.type === 'inlineCode' || childNode.type === 'text')
            ) {
              content = `[${childNode.value}](${node.url})`;
            }
          }

          content += ' ';

          break;
        }
        case 'code': {
          if (Array.isArray(section['@example'])) {
            section['@example'] = [...section['@example'], node.value];
          } else if (section['@example']) {
            section['@example'] = [section['@example'], node.value];
          } else {
            section['@example'] = node.value;
          }

          break;
        }
        default: {
          // No content to add to description
          break;
        }
      }

      if (content) {
        // Create the description property if it doesn't already exist
        section.description ??= '';

        // Add this nodes' content to the description
        section.description += content;
      }
    });
  };

  /**
   * Adds the deprecated property to the section if needed.
   * @param {import('../generated.d.ts').SectionBase} section
   * @param {HierarchizedEntry} entry
   */
  const addDeprecatedStatus = (section, entry) => {
    if (!entry.deprecated_in) {
      return;
    }

    section['@deprecated'] = enforceArray(entry.deprecated_in);
  };

  /**
   * Adds the stability property to the section.
   * @param {import('../generated.d.ts').SectionBase} section
   * @param {HierarchizedEntry} entry
   */
  const addStabilityStatus = (section, entry) => {
    const stability = entry.stability.children.map(node => node.data)?.[0];

    if (!stability) {
      return;
    }

    section.stability = {
      value: stability.index,
      text: stability.description,
    };
  };

  /**
   * Adds the properties relating to versioning to the section.
   * @param {import('../generated.d.ts').SectionBase} section
   * @param {HierarchizedEntry} entry
   */
  const addVersionProperties = (section, entry) => {
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
  };

  /**
   * Returns an object containing the properties that can be found in every
   * section type that we have.
   *
   * @param {HierarchizedEntry} entry The AST entry
   * @returns {import('../generated.d.ts').SectionBase}
   */
  return entry => {
    const [, ...nodes] = entry.content.children;

    const type = determineType(entry.heading, entry);

    /**
     * @type {import('../generated.d.ts').SectionBase}
     */
    const base = {
      type,
      '@name': entry.heading.data.name,
    };

    addDescriptionAndExamples(base, nodes);
    addDeprecatedStatus(base, entry);
    addStabilityStatus(base, entry);
    addVersionProperties(base, entry);

    if (base.description) {
      base.description = base.description.trim();
    }

    return base;
  };
};
