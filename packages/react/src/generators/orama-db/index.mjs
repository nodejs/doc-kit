'use strict';

import { join } from 'node:path';

import getConfig from '#core/utils/configuration/index.mjs';
import { writeFile } from '#core/utils/file.mjs';
import { groupNodesByModule } from '#core/utils/generators.mjs';
import { transformNodeToString } from '#core/utils/unist.mjs';
import { create, save, insertMultiple } from '@orama/orama';

import { SCHEMA } from '../../utils/orama-db/constants.mjs';
import { buildHierarchicalTitle } from '../../utils/orama-db/title.mjs';

export const name = 'orama-db';
export const dependsOn = '@doc-kittens/internal/metadata';
/**
 * Generates the Orama database.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('orama-db');

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
        href: `${entry.path.slice(1)}.html#${entry.heading.data.slug}`,
        siteSection: headings[0].heading.data.name,
      };
    })
  );

  // Insert all documents
  await insertMultiple(db, documents);

  const result = save(db);

  // Persist
  if (config.output) {
    await writeFile(
      join(config.output, 'orama-db.json'),
      config.minify ? JSON.stringify(result) : JSON.stringify(result, null, 2)
    );
  }

  return result;
}
