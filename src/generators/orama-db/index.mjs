'use strict';

import { writeFile } from 'node:fs/promises';

import { create, save, insertMultiple } from '@orama/orama';

import { SCHEMA } from './constants.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { transformNodeToString } from '../../utils/unist.mjs';

/**
 * Builds a hierarchical title chain based on heading depths
 *
 * @param {ApiDocMetadataEntry[]} headings - All headings sorted by order
 * @param {number} currentIndex - Index of current heading
 * @returns {string} Hierarchical title
 */
export function buildHierarchicalTitle(headings, currentIndex) {
  const currentNode = headings[currentIndex];
  const titleChain = [currentNode.heading.data.name];
  let targetDepth = currentNode.heading.depth - 1;

  // Walk backwards through preceding headings to build hierarchy
  for (let i = currentIndex - 1; i >= 0 && targetDepth > 0; i--) {
    const heading = headings[i];
    const headingDepth = heading.heading.depth;

    if (headingDepth <= targetDepth) {
      titleChain.unshift(heading.heading.data.name);
      targetDepth = headingDepth - 1;
    }
  }

  return titleChain.join(' > ');
}

/**
 * This generator is responsible for generating the Orama database for the
 * API docs. It is based on the legacy-json generator.
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, import('./types.d.ts').OramaDb>}
 */
export default {
  name: 'orama-db',
  version: '1.0.0',
  description: 'Generates the Orama database for the API docs.',

  dependsOn: 'metadata',

  /**
   * Generates the Orama database.
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { output }) {
    if (!input?.length) {
      throw new Error('Input data is required and must not be empty');
    }

    if (!output) {
      throw new Error('Output path is required');
    }

    const db = create({ schema: SCHEMA });

    const apiGroups = groupNodesByModule(input);

    // Process all API groups and flatten into a single document array
    const documents = Array.from(apiGroups.values()).flatMap(headings =>
      headings.map((entry, index) => {
        const hierarchicalTitle = buildHierarchicalTitle(headings, index);

        const paragraph = entry.content.children.find(
          child => child.type === 'paragraph'
        );

        return {
          title: hierarchicalTitle,
          description: paragraph
            ? transformNodeToString(paragraph, true)
            : undefined,
          path: `${entry.api}.html#${entry.slug}`,
        };
      })
    );

    // Insert all documents
    await insertMultiple(db, documents);

    // Persist
    await writeFile(`${output}/orama-db.json`, JSON.stringify(save(db)));
  },
};
