'use strict';

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
 * their tables of contents, in the order the manifest lists them, which is the
 * order the sidebar does.
 *
 * @param {Array<Pick<import('@doc-kit/generator-react/jsx-ast/types').PageCode, 'data' | 'headings'>>} parts
 * @param {Array<string>} order - The parts' `api`, as the manifest lists them
 */
const buildAllPage = (parts, order) => {
  const byApi = new Map(parts.map(part => [part.data.api, part]));
  const pages = order.map(api => byApi.get(api));

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

  // The parts in the manifest's order, and those still to come, once every
  // page's metadata is known
  let order;
  let missing;
  let added = false;

  for await (const batch of input) {
    const pages = [];

    for (const item of batch) {
      if ('manifest' in item) {
        order = item.manifest.filter(isPart).map(({ api }) => api);
        missing = new Set(order);

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
      pages.push(buildAllPage(parts, order));
      added = true;
    }

    yield pages;
  }
}
