'use strict';

import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { renderToString } from 'preact-render-to-string';
import { Fragment, jsx, jsxs } from 'preact/jsx-runtime';
import { SKIP, visit } from 'unist-util-visit';

import { createJSXElement } from '../utils/ast.mjs';

// Highlighted code is static: an island adopts it without rendering it again.
// So it reaches the page as the markup it renders to, rather than each of its
// tokens becoming a hast element, then a JSX element, then generated code,
// only to be rendered back into that same markup.

/**
 * Whether an element is code Shiki highlighted: the `<pre>` of a block, or
 * the `<code>` of a type.
 *
 * @param {import('hast').Element} element
 */
const isHighlighted = ({ properties = {} }) =>
  [properties.class ?? properties.className]
    .flat()
    .join(' ')
    .split(' ')
    .includes('shiki');

/**
 * Renders hast with the JSX runtime and the renderer of the pages, so the
 * markup is the one a page would render from that hast itself.
 *
 * @param {Array<import('hast').ElementContent>} children
 * @returns {string}
 */
const render = children =>
  renderToString(
    toJsxRuntime({ type: 'root', children }, { Fragment, jsx, jsxs })
  );

/**
 * Turns the `<code>` of highlighted code into a JSX `<code>` holding its
 * markup as it is.
 *
 * @param {import('hast').Element} code - The `<code>`
 * @param {boolean} [inline] - Whether it's a type's, rather than a block's
 */
const embedCode = (
  { properties: { class: className, ...properties }, children },
  inline = false
) =>
  createJSXElement('code', {
    inline,
    className: [className].flat().join(' ') || undefined,
    ...properties,
    dangerouslySetInnerHTML: { __html: render(children) },
  });

/**
 * Embeds the code blocks of a tree that Shiki highlighted.
 *
 * @template {import('hast').Root} T
 * @param {T} tree
 * @returns {T}
 */
export const embedHighlightedBlocks = tree => {
  visit(tree, 'element', node => {
    const [code] = node.children;

    if (node.tagName === 'pre' && code?.tagName === 'code') {
      if (isHighlighted(node)) {
        node.children[0] = embedCode(code);
      }

      return SKIP;
    }
  });

  return tree;
};

/**
 * Wraps a `typeAnnotation` handler of `remark-rehype`, embedding the types it
 * highlights.
 *
 * @param {(state: import('mdast-util-to-hast').State, node: import('mdast').Node) => import('hast').Element} handler
 * @returns {typeof handler}
 */
export const embedHighlightedTypes = handler => (state, node) => {
  const result = handler(state, node);

  // A type that didn't parse, or links nowhere, isn't highlighted
  if (!isHighlighted(result)) {
    return result;
  }

  const code = embedCode(result, true);

  state.patch(node, code);

  return code;
};

/**
 * Embeds the code blocks that Shiki highlighted.
 *
 * @type {import('unified').Plugin<[], import('hast').Root>}
 */
export default function rehypeStaticMarkup() {
  return embedHighlightedBlocks;
}
