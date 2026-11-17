import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

import { TAG_TRANSFORMS } from '../constants.mjs';

/**
 * Checks whether a HAST node is the generated GFM footnotes section.
 * @param {import('hast').Element} node
 */
const isFootnotesSection = node =>
  node?.type === 'element' &&
  node.tagName === 'section' &&
  (node.properties?.dataFootnotes !== undefined ||
    node.properties?.className?.includes('footnotes'));

/**
 * Whether a HAST node is a table cell.
 * @param {import('hast').Element} node
 */
const isTableCell = node => node.tagName === 'td' || node.tagName === 'th';

/**
 * Finds the JSX fragment wrapping the page content (see `buildContent`).
 * @param {import('hast').Root} tree
 */
const findPageContent = tree =>
  tree.children.find(
    node =>
      (node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement') &&
      node.name === null &&
      node.children
  );

/**
 * @template {import('unist').Node} T
 * @param {T} tree
 * @returns {T}
 */
const transformer = tree => {
  visit(tree, 'element', (node, index, parent) => {
    node.tagName = TAG_TRANSFORMS[node.tagName] || node.tagName;

    // Wrap <table> in a <div class="table-container">, and apply responsive
    // data attributes
    if (node.tagName === 'table') {
      if (parent) {
        parent.children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['overflow-container'] },
          children: [node],
        };
      }

      // Not every table will have a header, so only do this on tables
      // with them.
      const thead = node.children.find(el => el.tagName === 'thead');
      const tbody = node.children.find(el => el.tagName === 'tbody');

      if (thead && tbody) {
        // Table rows and cells don't have to be the first children, nor be
        // adjacent: `rehype-raw` keeps the whitespace between them as text
        // nodes.
        // TODO(@avivkeller): These are only strings afaict, so a `toString` dependency
        // might not actually be needed.
        const headerRow = thead.children.find(el => el.tagName === 'tr');
        const headers =
          headerRow?.children.filter(isTableCell).map(toString) ?? [];

        for (const tr of tbody.children.filter(el => el.tagName === 'tr')) {
          const cells = tr.children.filter(isTableCell);

          for (const [column, cell] of cells.entries()) {
            if (cell.tagName === 'td' && headers[column] !== undefined) {
              cell.properties ||= {};
              cell.properties['data-label'] = headers[column];
            }
          }
        }
      }
    }
  });

  const index = tree.children.findLastIndex(isFootnotesSection);

  if (index !== -1) {
    const [section] = tree.children.splice(index, 1);
    const content = findPageContent(tree);

    if (content) {
      content.children.push(section);
    } else {
      tree.children.push(section);
    }
  }
};

/**
 * Transforms elements in a syntax tree by replacing tag names according to the mapping.
 *
 * Also moves any generated root section into its proper location in the AST.
 */
export default () => transformer;
