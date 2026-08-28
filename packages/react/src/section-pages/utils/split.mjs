'use strict';

import { CHUNKABLE_TYPES, SELF_CONTAINED_TYPES } from '../constants.mjs';

/**
 * Whether an entry documents an API entry rather than prose: the metadata
 * generator typed its heading (a method, class, event, ...).
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} entry
 * @returns {boolean}
 */
const isApiEntry = entry => Boolean(entry.heading.data.type);

/**
 * Collects the entries whose section — the entry itself, or any heading
 * nested below it, whether or not that heading gets a chunk of its own —
 * documents at least one API entry. Sections that are pure prose (a module's
 * "Introduction", the "Notes" at the end of a reference) are only worth
 * reading in the context of the full page.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries - In document order
 * @returns {Set<import('@doc-kit/core/generators/metadata/types').MetadataEntry>}
 */
const findSectionsWithApi = entries => {
  const withApi = new Set();

  // The headings whose sections are still open at the current entry
  const open = [];

  for (const entry of entries) {
    const { depth } = entry.heading;

    while (open.length > 0 && open.at(-1).heading.depth >= depth) {
      open.pop();
    }

    open.push(entry);

    if (isApiEntry(entry)) {
      for (const section of open) {
        withApi.add(section);
      }
    }
  }

  return withApi;
};

/**
 * Decides whether an entry's heading starts a new chunk.
 *
 * Every depth-2 heading does. Deeper headings only do when they document an
 * API entry (a method, class, event, ...) at or above `maxDepth`, and when
 * they are not part of a self-contained section such as a class.
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} entry
 * @param {import('../types').Chunk | undefined} current - The chunk being built
 * @param {number} maxDepth
 * @returns {boolean}
 */
const startsChunk = (entry, current, maxDepth) => {
  const { depth, data } = entry.heading;

  if (depth > maxDepth) {
    return false;
  }

  const insideSelfContained =
    current !== undefined &&
    depth > current.depth &&
    SELF_CONTAINED_TYPES.has(current.head.heading.data.type);

  if (insideSelfContained) {
    return false;
  }

  return depth === 2 || CHUNKABLE_TYPES.has(data.type);
};

/**
 * Splits one module's entries (in document order) into chunks.
 *
 * The module's own depth-1 heading never becomes a chunk: the full page
 * already covers it. Entries that precede the first chunk-starting heading,
 * and sections that document no API entry at all, are therefore only present
 * on the full page.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries
 * @param {number} maxDepth
 * @returns {Array<import('../types').Chunk>}
 */
export const splitIntoChunks = (entries, maxDepth) => {
  /** @type {Array<import('../types').Chunk>} */
  const chunks = [];

  /** @type {import('../types').Chunk | undefined} */
  let current;

  for (const entry of entries) {
    const { depth } = entry.heading;

    if (depth === 1) {
      current = undefined;
      continue;
    }

    if (startsChunk(entry, current, maxDepth)) {
      current = { head: entry, depth, entries: [entry] };
      chunks.push(current);
    } else if (current) {
      current.entries.push(entry);
    }
  }

  const withApi = findSectionsWithApi(entries);

  return chunks.filter(chunk => withApi.has(chunk.head));
};
