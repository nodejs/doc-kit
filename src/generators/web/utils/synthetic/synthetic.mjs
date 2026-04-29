'use strict';

import { u as createTree } from 'unist-builder';

/**
 * Builds a metadata head shaped like the entries produced by the `metadata`
 * generator. Used by pages that don't originate from a real markdown file
 * (e.g. `all`, `index`, `404`).
 *
 * @param {string} api - File slug; doubles as the path and basename.
 * @param {string} name - Heading display name.
 */
export const createSyntheticHead = (api, name) => ({
  api,
  path: `/${api}`,
  basename: api,
  heading: {
    type: 'heading',
    depth: 1,
    children: [{ type: 'text', value: name }],
    data: { name, text: name, slug: api },
  },
});

/**
 * Wraps a synthetic head into a full metadata-shaped entry by attaching a
 * content tree. The head's heading is placed at the start of `content` so
 * `buildContent`'s heading visit can transform it like any other entry.
 *
 * @param {ReturnType<typeof createSyntheticHead>} head
 * @param {Array<import('unist').Node>} children
 */
export const wrapAsEntry = (head, children) => ({
  ...head,
  stability: null,
  content: createTree('root', [head.heading, ...children]),
});
