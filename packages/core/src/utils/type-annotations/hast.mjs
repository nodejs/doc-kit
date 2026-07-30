'use strict';

import { highlighter } from '../highlighter.mjs';

/**
 * Slices a type's text by its resolved link ranges into hast children —
 * plain text segments interleaved with `<a class="type-link">` anchors.
 *
 * @param {string} value The type text
 * @param {Array<{ start: number, end: number, href: string }>} links Sorted, disjoint ranges
 * @returns {Array<import('hast').ElementContent>}
 */
const buildLinkedChildren = (value, links) => {
  const children = [];
  let cursor = 0;

  for (const { start, end, href } of links) {
    if (start > cursor) {
      children.push({ type: 'text', value: value.slice(cursor, start) });
    }

    children.push({
      type: 'element',
      tagName: 'a',
      properties: { href, className: ['type-link'] },
      children: [{ type: 'text', value: value.slice(start, end) }],
    });

    cursor = end;
  }

  if (cursor < value.length) {
    children.push({ type: 'text', value: value.slice(cursor) });
  }

  return children;
};

/**
 * Minimal mdast→hast handler for `typeAnnotation` nodes: one
 * `<code class="type">` whose resolved identifiers are plain `<a>` links.
 * No syntax highlighting — used by the legacy generators.
 *
 * @param {import('mdast-util-to-hast').State} state
 * @param {import('mdast').Node} node
 * @returns {import('hast').Element}
 */
export const typeAnnotationToHast = (state, node) => {
  const result = {
    type: 'element',
    tagName: 'code',
    properties: { className: ['type'] },
    children: buildLinkedChildren(node.value, node.data?.links ?? []),
  };

  state.patch(node, result);

  return state.applyData(node, result);
};

/**
 * Syntax-highlighted mdast→hast handler for `typeAnnotation` nodes, used by
 * the web (JSX) pipeline. The whole type is highlighted as one inline
 * TypeScript fragment, and each resolved identifier's exact character range
 * is wrapped in an `<a>` via Shiki decorations.
 *
 * Falls back to the minimal handler when the type failed to parse or nothing
 * resolved (no point paying for highlighting then).
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
    theme: highlighter.shiki.getLoadedThemes()[0],
    decorations: links.map(({ start, end, href }) => ({
      start,
      end,
      tagName: 'a',
      properties: { href, class: 'type-link' },
      alwaysWrap: true,
    })),
  });

  // codeToHast wraps the highlighted line in <pre><code>; re-shape that into
  // a single inline <code> element ("only the outermost type opens/closes
  // the code fragment") carrying Shiki's theme styling. The <pre>'s tabindex
  // is dropped — an inline fragment is no scroll container.
  const [preElement] = root.children;
  const [codeElement] = preElement.children;

  const result = {
    type: 'element',
    tagName: 'code',
    properties: {
      class: `${preElement.properties.class} type`,
      style: preElement.properties.style,
    },
    children: codeElement.children,
  };

  state.patch(node, result);

  return state.applyData(node, result);
};
