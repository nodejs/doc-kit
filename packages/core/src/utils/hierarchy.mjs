'use strict';

/**
 * A node in the entry hierarchy.
 *
 * @typedef {object} HierarchizedEntry
 * @property {import('../generators/metadata/types').MetadataEntry} entry The metadata entry this node wraps
 * @property {Array<HierarchizedEntry>} children Entries nested under this one, by heading depth
 */

/**
 * Finds the closest preceding node whose heading is shallower than the
 * entry's, which is the entry's parent.
 *
 * @param {import('../generators/metadata/types').MetadataEntry} entry The entry to find a parent for
 * @param {Array<HierarchizedEntry>} nodes Wrapper nodes, index-aligned with the entries
 * @param {number} startIdx The index to search backwards from
 * @returns {HierarchizedEntry | undefined} The parent, or `undefined` when no shallower entry precedes it
 */
export const findParent = (entry, nodes, startIdx) => {
  for (let i = startIdx; i >= 0; i--) {
    if (nodes[i].entry.heading.depth < entry.heading.depth) {
      return nodes[i];
    }
  }

  return undefined;
};

/**
 * @param {Array<import('../generators/metadata/types').MetadataEntry>} entries Entries in document order
 * @returns {Array<HierarchizedEntry>} The root nodes
 */
export const buildHierarchy = entries => {
  const roots = [];

  // Wrapper nodes, index-aligned with `entries`
  const nodes = entries.map(entry => ({ entry, children: [] }));

  nodes.forEach((node, i) => {
    const parent =
      node.entry.heading.depth <= 1
        ? undefined
        : findParent(node.entry, nodes, i - 1);

    (parent?.children ?? roots).push(node);
  });

  return roots;
};
