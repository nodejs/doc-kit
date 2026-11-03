'use strict';

import { toBatches } from '@doc-kit/core/utils/generators.mjs';
import { headingSortFn } from '@doc-kit/generator-react/jsx-ast/utils/getSortedHeadNodes';

// The metadata of `all.html`
const HEAD = {
  api: 'all',
  path: '/all',
  basename: 'all',
  synthetic: true,
  heading: {
    type: 'heading',
    depth: 1,
    children: [{ type: 'text', value: 'All' }],
    data: { name: 'All', text: 'All', slug: 'all' },
  },
};

/**
 * Whether a page is part of `all.html`: the module pages, minus the index.
 * Chunk pages and the other synthetic pages are left out, as the module pages
 * carry their content.
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} data
 * @returns {boolean}
 */
const isPart = data => !data.synthetic && !data.chunk && data.api !== 'index';

/**
 * Builds `all.html` from its parts: their content one after the other, and
 * their tables of contents, in the order the sidebar lists them.
 *
 * @param {Array<Pick<import('@doc-kit/generator-react/jsx-ast/types').PageCode, 'data' | 'headings'>>} parts
 */
const buildAllPage = parts => {
  const pages = parts.toSorted((a, b) => headingSortFn(a.data, b.data));

  return {
    data: HEAD,
    headings: pages.flatMap(({ headings }) => headings),
    parts: pages.map(({ data }) => data.api),
  };
};

/**
 * Passes `jsx-ast`'s pages on, with `all.html`'s metadata in the manifest, and
 * `all.html` itself right after the last of its parts.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input) {
  const parts = [];

  // The parts still to come, once every page's metadata is known
  let missing;
  let added = false;

  for await (const batch of toBatches(input)) {
    const pages = [];

    for (const item of batch) {
      if ('manifest' in item) {
        missing = new Set(item.manifest.filter(isPart).map(({ api }) => api));

        for (const { data } of parts) {
          missing.delete(data.api);
        }

        pages.push({ manifest: [...item.manifest, HEAD] });

        continue;
      }

      pages.push(item);

      if (isPart(item.data)) {
        parts.push({ data: item.data, headings: item.headings });
        missing?.delete(item.data.api);
      }
    }

    if (!added && missing?.size === 0) {
      pages.push(buildAllPage(parts));
      added = true;
    }

    yield pages;
  }

  // Without a manifest, once every page has passed
  if (!added) {
    yield [buildAllPage(parts)];
  }
}
