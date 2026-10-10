'use strict';

import { createTypeAnnotationHandler } from '@doc-kit/core/plugins/type-annotations/highlighter.mjs';
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
 * The attributes and the markup of the `<code>` of highlighted code.
 *
 * @param {import('hast').Element} code - The `<code>`
 * @returns {{ attributes: Record<string, unknown>, html: string }}
 */
const toMarkup = ({
  properties: { class: className, ...properties },
  children,
}) => ({
  attributes: {
    className: [className].flat().join(' ') || undefined,
    ...properties,
  },
  html: render(children),
});

/**
 * A JSX `<code>` holding highlighted markup as it is.
 *
 * @param {ReturnType<typeof toMarkup>} markup
 * @param {boolean} [inline] - Whether it's a type's, rather than a block's
 */
const createCodeElement = ({ attributes, html }, inline = false) =>
  createJSXElement('code', {
    inline,
    ...attributes,
    dangerouslySetInnerHTML: { __html: html },
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
        node.children[0] = createCodeElement(toMarkup(code));
      }

      return SKIP;
    }
  });

  return tree;
};

/**
 * Creates the `typeAnnotation` handler of `remark-rehype` highlighting types
 * and embedding them.
 *
 * Every highlighted type is kept, by highlighter: the same few hundred types
 * are highlighted thousands of times, `{string}` alone on most pages.
 *
 * @param {() => import('@doc-kit/core/plugins/shiki/highlighter.mjs').SyntaxHighlighter} getHighlighter - Gives the highlighter, once a type is highlighted
 * @returns {(state: import('mdast-util-to-hast').State, node: import('mdast').Node) => import('hast').ElementContent}
 */
export const embedHighlightedTypes = getHighlighter => {
  const highlight = createTypeAnnotationHandler(getHighlighter);
  const highlighted = new WeakMap();

  return (state, node) => {
    const highlighter = getHighlighter();

    if (!highlighted.has(highlighter)) {
      highlighted.set(highlighter, new Map());
    }

    const types = highlighted.get(highlighter);
    const key = JSON.stringify([node.value, node.data]);

    if (!types.has(key)) {
      const result = highlight(state, node);

      // A type that didn't parse, or links nowhere, isn't highlighted
      if (!isHighlighted(result)) {
        return result;
      }

      types.set(key, toMarkup(result));
    }

    const code = createCodeElement(types.get(key), true);

    state.patch(node, code);

    return code;
  };
};

/**
 * Embeds the code blocks that Shiki highlighted.
 *
 * @type {import('unified').Plugin<[], import('hast').Root>}
 */
export default function rehypeStaticMarkup() {
  return embedHighlightedBlocks;
}
