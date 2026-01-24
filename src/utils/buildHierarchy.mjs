'use strict';

/**
 * @typedef {{
 * hierarchyChildren: Array<HierarchizedEntry>
 * } & ApiDocMetadataEntry} HierarchizedEntry
 */

/**
 * Recursively finds the most suitable parent entry for a given `entry` based on heading depth.
 *
 * @param {ApiDocMetadataEntry} entry
 * @param {ApiDocMetadataEntry[]} entries
 * @param {number} startIdx
 * @returns {import('../types.d.ts').HierarchizedEntry}
 */
export function findParent(entry, entries, startIdx) {
  // Base case: if we're at the beginning of the list, no valid parent exists.
  if (startIdx < 0) {
    throw new Error(
      `Cannot find a suitable parent for entry at index ${startIdx + 1}`
    );
  }

  const candidateParent = entries[startIdx];
  const candidateDepth = candidateParent.heading.depth;

  // If we find a suitable parent, return it.
  if (candidateDepth < entry.heading.depth) {
    candidateParent.hierarchyChildren ??= [];
    return candidateParent;
  }

  // Recurse upwards to find a suitable parent.
  return findParent(entry, entries, startIdx - 1);
}

/**
 * We need the files to be in a hierarchy based off of depth, but they're
 * given to us flattened. So, let's fix that.
 *
 * Assuming that {@link entries} is in the same order as the elements are in
 * the markdown, we can use the entry's depth property to reassemble the
 * hierarchy.
 *
 * If depth <= 1, it's a top-level element (aka a root).
 *
 * If it's depth is greater than the previous entry's depth, it's a child of
 * the previous entry. Otherwise (if it's less than or equal to the previous
 * entry's depth), we need to find the entry that it was the greater than. We
 * can do this by just looping through entries in reverse starting at the
 * current index - 1.
 *
 * @param {Array<ApiDocMetadataEntry>} entries
 * @returns {Array<import('../types.d.ts').HierarchizedEntry>}
 */
export function buildHierarchy(entries) {
  const roots = [];

  // Main loop to construct the hierarchy.
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const currentDepth = entry.heading.depth;

    // Top-level entries are added directly to roots.
    if (currentDepth <= 1) {
      roots.push(entry);
      continue;
    }

    // For non-root entries, find the appropriate parent.
    const previousEntry = entries[i - 1];
    const previousDepth = previousEntry.heading.depth;

    if (currentDepth > previousDepth) {
      previousEntry.hierarchyChildren ??= [];
      previousEntry.hierarchyChildren.push(entry);
    } else {
      // Use recursive helper to find the nearest valid parent.
      const parent = findParent(entry, entries, i - 2);
      parent.hierarchyChildren.push(entry);
    }
  }

  return roots;
}
