'use strict';

import { highlighter } from '../highlighter.mjs';

const TYPE_THEME = highlighter.shiki.getLoadedThemes()[0];

/**
 * Creates a HAST text node.
 *
 * @param {string} value
 * @returns {import('hast').Text}
 */
const text = value => ({
  type: 'text',
  value,
});

/**
 * Creates a HAST element.
 *
 * @param {string} tagName
 * @param {import('hast').Properties} properties
 * @param {import('hast').ElementContent[]} children
 * @returns {import('hast').Element}
 */
const element = (tagName, properties, children) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

/**
 * Applies mdast metadata to a generated HAST node.
 *
 * @param {import('mdast-util-to-hast').State} state
 * @param {import('mdast').Node} node
 * @param {import('hast').Element} result
 * @returns {import('hast').Element}
 */
const finalize = (state, node, result) => {
  state.patch(node, result);
  return state.applyData(node, result);
};

/**
 * Slices a type's text by its resolved link ranges into HAST children.
 *
 * @param {string} value
 * @param {Array<{ start: number, end: number, href: string }>} links
 * @returns {import('hast').ElementContent[]}
 */
const buildLinkedChildren = (value, links) => {
  const children = [];
  let cursor = 0;

  for (const { start, end, href } of links) {
    if (start > cursor) {
      children.push(text(value.slice(cursor, start)));
    }

    children.push(
      element(
        'a',
        {
          href,
          class: 'type-link',
        },
        [text(value.slice(start, end))]
      )
    );

    cursor = end;
  }

  if (cursor < value.length) {
    children.push(text(value.slice(cursor)));
  }

  return children;
};

/**
 * Minimal mdast→hast handler for `typeAnnotation` nodes.
 *
 * @param {import('mdast-util-to-hast').State} state
 * @param {import('mdast').Node} node
 * @returns {import('hast').Element}
 */
export const typeAnnotationToHast = (state, node) =>
  finalize(
    state,
    node,
    element(
      'code',
      {
        class: 'type',
      },
      buildLinkedChildren(node.value, node.data?.links ?? [])
    )
  );

/**
 * Syntax-highlighted mdast→hast handler for `typeAnnotation` nodes.
 *
 * Falls back to the minimal handler when parsing failed or nothing resolved.
 *
 * @param {import('mdast-util-to-hast').State} state
 * @param {import('mdast').Node} node
 * @returns {import('hast').Element}
 */
export const typeAnnotationToHighlightedHast = (state, node) => {
  const links = node.data?.links ?? [];

  if (node.data?.parseError || links.length === 0) {
    return typeAnnotationToHast(state, node);
  }

  const root = highlighter.shiki.codeToHast(node.value, {
    lang: 'typescript',
    theme: TYPE_THEME,
    decorations: links.map(({ start, end, href }) => ({
      start,
      end,
      tagName: 'a',
      properties: {
        href,
        class: 'type-link',
      },
      alwaysWrap: true,
    })),
  });

  const preElement = root.children[0];
  const codeElement = preElement.children[0];

  return finalize(
    state,
    node,
    element(
      'code',
      {
        class: `${preElement.properties.class} type`,
        style: preElement.properties.style,
      },
      codeElement.children
    )
  );
};
