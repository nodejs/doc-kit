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
