'use strict';

import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { u as createTree } from 'unist-builder';
import { SKIP, visit } from 'unist-util-visit';

import { lazy } from './misc.mjs';

/**
 * Renders a `root` as just its children, since content placed directly on one
 * is otherwise rendered with a line break between each node, which surfaces as
 * stray whitespace.
 *
 * @param {import('mdast-util-to-hast').State} state
 * @param {import('unist').Parent} node
 */
const inlineRoot = (state, node) => ({
  type: 'root',
  children: state.all(node),
});

/**
 * Retrieves an instance of Remark configured to parse plain markdown, without
 * the extensions that only apply to whole documents.
 */
const getInlineParser = lazy(() => unified().use(remarkParse));

/**
 * Retrieves an instance of Remark configured to render inline nodes as an HTML
 * string. Raw HTML is dropped rather than passed through, since the result is
 * inserted into the page as-is.
 */
const getInlineRenderer = lazy(() =>
  unified()
    .use(remarkRehype, { handlers: { root: inlineRoot } })
    .use(rehypeStringify)
);

/**
 * Parses a single line of markdown (a change description, a summary, ...) into
 * the inline nodes it is made of.
 *
 * @param {string} markdown - The markdown to parse.
 * @param {boolean} [dropLinks] - Replace links with their text? Anchors cannot
 * nest, so content rendered inside a link must not contain one.
 * @returns {Array<import('mdast').PhrasingContent>} The parsed nodes.
 */
export const parseInline = (markdown, dropLinks = false) => {
  const tree = getInlineParser().parse(markdown);

  if (dropLinks) {
    visit(tree, 'link', (node, index, parent) => {
      parent.children.splice(index, 1, ...node.children);

      return [SKIP, index];
    });
  }

  const [first] = tree.children;

  // A single line of prose parses into one paragraph, which is dropped so the
  // nodes can be rendered inline
  return tree.children.length === 1 && first.type === 'paragraph'
    ? first.children
    : tree.children;
};

/**
 * Renders inline nodes as an HTML string, for the places that hand rendered
 * markup to a component through a data channel rather than as an AST.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes - The nodes to render.
 * @returns {string} The rendered HTML.
 */
export const renderAsHTML = nodes => {
  const renderer = getInlineRenderer();

  return renderer.stringify(renderer.runSync(createTree('root', nodes)));
};
