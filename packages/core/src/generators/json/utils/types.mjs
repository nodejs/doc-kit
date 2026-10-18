'use strict';

/**
 * Builds a type from a resolved `typeAnnotation` node.
 *
 * @param {import('mdast').Node | undefined} node
 * @returns {import('../types').Type | null}
 */
export const toType = node =>
  node
    ? {
        text: node.value,
        links: (node.data?.links ?? []).map(({ text, href, start, end }) => ({
          name: text,
          href,
          start,
          end,
        })),
      }
    : null;

/**
 * Builds a type from bare text, with nothing resolved.
 *
 * @param {string} text
 * @returns {import('../types').Type}
 */
export const plainType = text => ({ text, links: [] });
