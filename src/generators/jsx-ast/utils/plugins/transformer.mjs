import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

import { TAG_TRANSFORMS } from '../../constants.mjs';

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
 * Finds the generated page Layout node.
 * @param {import('hast').Root} tree
 */
const findLayout = tree =>
  tree.children.find(node => node.name === 'Layout' && node.children);

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

      if (thead) {
        // TODO(@avivkeller): These are only strings afaict, so a `toString` dependency
        // might not actually be needed.
        const headers = thead.children[0].children.map(toString);
        const tbody = node.children.find(el => el.tagName === 'tbody');

        visit(
          tbody,
          node => node.tagName === 'td',
          (node, index) => (node.properties['data-label'] = headers[index])
        );
      }
    }
  });

  const index = tree.children.findLastIndex(isFootnotesSection);

  if (index !== -1) {
    const [section] = tree.children.splice(index, 1);
    const layout = findLayout(tree);

    if (layout) {
      layout.children.push(section);
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
