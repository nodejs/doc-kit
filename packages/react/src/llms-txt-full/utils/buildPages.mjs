import { getRemark, getRemarkMdx } from '@doc-kit/core/utils/remark.mjs';

/**
 * The Markdown of every page, from the content of its entries, in the order
 * of the input.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries
 * @returns {Array<{ path: string, markdown: string }>}
 */
export const buildPages = entries => {
  /** @type {Map<string, Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>>} */
  const pages = new Map();

  for (const entry of entries) {
    if (!entry.synthetic) {
      pages.set(entry.path, [...(pages.get(entry.path) ?? []), entry]);
    }
  }

  return [...pages].map(([path, sections]) => {
    const remark = sections[0].mdx ? getRemarkMdx() : getRemark();

    const markdown = sections
      .map(({ content }) => remark.stringify(content).trim())
      .filter(Boolean)
      .join('\n\n');

    return { path, markdown: `${markdown}\n` };
  });
};
