/**
 * Recursively finds the most suitable parent node for a given `entry` based on heading depth.
 *
 * @param {import('../../metadata/types').MetadataEntry} entry
 * @param {Array<import('../types.d.ts').HierarchizedEntry>} nodes
 * @param {number} startIdx
 * @returns {import('../types.d.ts').HierarchizedEntry}
 */
export function findParent(entry, nodes, startIdx) {
  // Base case: if we're at the beginning of the list, no valid parent exists.
  if (startIdx < 0) {
    throw new Error(
      `Cannot find a suitable parent for entry at index ${startIdx + 1}`
    );
  }

  const candidateParent = nodes[startIdx];

  // If we find a suitable parent, return it.
  if (candidateParent.entry.heading.depth < entry.heading.depth) {
    return candidateParent;
  }

  // Recurse upwards to find a suitable parent.
  return findParent(entry, nodes, startIdx - 1);
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
 * Otherwise, its parent is the nearest earlier entry with a lower depth,
 * found by looping through entries in reverse starting at the current
 * index - 1.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries
 * @returns {Array<import('../types.d.ts').HierarchizedEntry>}
 */
export function buildHierarchy(entries) {
  const roots = [];

  // Wrapper nodes, index-aligned with `entries`.
  const nodes = entries.map(entry => ({ entry, children: [] }));

  // Main loop to construct the hierarchy.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Top-level entries are added directly to roots.
    if (node.entry.heading.depth <= 1) {
      roots.push(node);
      continue;
    }

    // For non-root entries, find the appropriate parent.
    findParent(node.entry, nodes, i - 1).children.push(node);
  }

  return roots;
}
