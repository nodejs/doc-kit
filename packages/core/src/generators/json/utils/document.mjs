'use strict';

import { buildHierarchy } from '#utils/hierarchy.mjs';
import { annotateOverloads } from '#utils/overloads.mjs';

import { DOCUMENT_TYPES } from '../constants.mjs';
import { buildEntry, entryBody } from './entry.mjs';
import { buildNode } from './node.mjs';

/**
 * Builds a document from a module's entries.
 *
 * @param {import('../../metadata/types').MetadataEntry} head The module's title entry
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries All of the module's entries, in document order
 * @param {import('../types').Dependencies} dependencies
 * @returns {import('../types').Document}
 */
export const buildDocument = (head, entries, { schemaURL, sourceURL }) => {
  annotateOverloads(entries);

  const type = DOCUMENT_TYPES.has(head.type) ? head.type : 'module';
  const scope = type === 'global' ? 'global' : 'module';

  // The title entry is the root; any other root (a second title, an entry
  // with no shallower heading before it) is treated as a child of it
  const roots = buildHierarchy(entries);
  const root = roots.find(node => node.entry === head) ?? roots[0];
  const children = [
    ...(root?.children ?? []),
    ...roots.filter(node => node !== root),
  ].map(node => buildNode(node, scope));

  const { title, ...entry } = buildEntry(head, entryBody(head));

  return {
    $schema: schemaURL,
    id: head.api,
    path: head.path,
    type,
    module:
      typeof head.name === 'string'
        ? head.name
        : type === 'module'
          ? head.api
          : null,
    title,
    introducedIn:
      head.introduced_in == null ? null : String(head.introduced_in),
    sourceLink: head.source_link
      ? {
          path: String(head.source_link),
          url: sourceURL ? `${sourceURL}${head.source_link}` : null,
        }
      : null,
    ...entry,
    children,
  };
};
