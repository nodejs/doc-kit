'use strict';

import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';
import { groupNodesByModule } from '@doc-kit/core/utils/generators.mjs';
import { transformNodeToString } from '@doc-kit/core/utils/unist.mjs';
import { create, save, insertMultiple } from '@orama/orama';

import { SCHEMA } from './constants.mjs';
import { buildHierarchicalTitle } from './utils/title.mjs';

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

      const href = `${entry.path}.html#${entry.heading.data.slug}`;

      return {
        // Orama makes up a time-based id when none is given, which would
        // change the saved index on every build
        id: href,
        title: hierarchicalTitle,
        description: paragraph
          ? transformNodeToString(paragraph, true)
          : undefined,
        href,
        siteSection: headings[0].heading.data.name,
      };
    })
  );

  // The saved index follows insertion order, which depends on the order the
  // generator's input arrives in. Sort without a locale so it is stable on
  // every machine.
  documents.sort((a, b) => (a.href < b.href ? -1 : a.href > b.href ? 1 : 0));

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
