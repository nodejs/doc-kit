'use strict';

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
