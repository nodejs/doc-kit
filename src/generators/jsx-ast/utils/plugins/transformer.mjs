import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

import { TAG_TRANSFORMS } from '../../constants.mjs';

/**
 * Checks whether a node is the generated GFM footnotes section.
 *
 * @param {import('hast').Node} node
 */
const isFootnotesSection = node =>
  node?.type === 'element' &&
  node.tagName === 'section' &&
  (node.properties?.dataFootnotes !== undefined ||
    node.properties?.className?.includes('footnotes'));

/**
 * Checks whether a node is the generated Layout component.
 *
 * @param {import('unist').Node} node
 */
const isLayout = node =>
  node?.name === 'Layout' && Array.isArray(node.children);

/**
 * Adds responsive labels to table cells.
 *
 * @param {import('hast').Element} table
 */
const transformTable = table => {
  const thead = table.children.find(node => node.tagName === 'thead');

  if (!thead) {
    return;
  }

  const headerRow = thead.children?.[0];

  if (!headerRow?.children) {
    return;
  }

  const headers = headerRow.children.map(toString);

  const tbody = table.children.find(node => node.tagName === 'tbody');

  if (!tbody?.children) {
    return;
  }

  for (const row of tbody.children) {
    for (const [index, cell] of (row.children ?? []).entries()) {
      if (cell.tagName === 'td') {
        cell.properties ??= {};
        cell.properties['data-label'] = headers[index];
      }
    }
  }
};

/**
 * @template {import('unist').Node} T
 * @param {T} tree
 * @returns {T}
 */
const transformer = tree => {
  let layout = null;

  /**
   * Transform element nodes and locate Layout.
   *
   * We intentionally visit every node because MDX JSX nodes
   * are not HAST "element" nodes.
   */
  visit(tree, node => {
    /**
     * Find Layout regardless of node type.
     */
    if (isLayout(node)) {
      layout = node;
    }

    /**
     * Only HAST elements have tagName.
     */
    if (node.type !== 'element') {
      return;
    }

    /**
     * Normalize HTML tags.
     */
    const transformedTag = TAG_TRANSFORMS[node.tagName];

    if (transformedTag) {
      node.tagName = transformedTag;
    }

    /**
     * Tables need special handling.
     */
    if (node.tagName === 'table') {
      transformTable(node);
    }
  });

  /**
   * Find generated footnotes directly among root children.
   *
   * This is faster and more reliable than looking during
   * the recursive traversal because footnotes are always
   * generated at the document root.
   */
  const footnotesIndex = tree.children.findLastIndex(isFootnotesSection);

  if (footnotesIndex !== -1) {
    const [footnotes] = tree.children.splice(footnotesIndex, 1);

    if (layout) {
      layout.children.push(footnotes);
    } else {
      tree.children.push(footnotes);
    }
  }
};

/**
 * Transforms elements in a syntax tree by replacing tag names according to the mapping.
 *
 * Also moves generated footnotes sections into Layout.
 */
export default () => transformer;
