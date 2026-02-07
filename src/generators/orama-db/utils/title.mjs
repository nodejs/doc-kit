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
  for (let i = currentIndex - 1; i >= 1 && targetDepth > 0; i--) {
    const heading = headings[i];
    const headingDepth = heading.heading.depth;

    if (headingDepth <= targetDepth) {
      titleChain.unshift(heading.heading.data.name);
      targetDepth = headingDepth - 1;
    }
  }

  return titleChain.join(' > ');
}
