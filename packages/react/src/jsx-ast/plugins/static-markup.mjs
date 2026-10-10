'use strict';

import { toHtml } from 'hast-util-to-html';
import { SKIP, visit } from 'unist-util-visit';

import { createJSXElement } from '../utils/ast.mjs';
import { getClassNames } from '../utils/hast.mjs';

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
const isHighlighted = element => getClassNames(element).includes('shiki');

/**
 * Turns the `<code>` of highlighted code into a JSX `<code>` holding its
 * markup as it is.
 *
 * @param {import('hast').Element} code - The `<code>`
 * @param {boolean} [inline] - Whether it's a type's, rather than a block's
 */
const embedCode = (code, inline = false) => {
  const classNames = getClassNames(code);

  // JSX takes the class names as one `className`, which comes first, as
  // `class` did
  const attributes = {
    inline,
    className: classNames.length > 0 ? classNames.join(' ') : undefined,
    ...code.properties,
    dangerouslySetInnerHTML: { __html: toHtml(code.children) },
  };

  delete attributes.class;

  return createJSXElement('code', attributes);
};

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
export default () => embedHighlightedBlocks;
