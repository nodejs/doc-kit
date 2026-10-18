'use strict';

import { getSortedHeadNodes } from '../../jsx-ast/utils/getSortedHeadNodes.mjs';
import { createSyntheticHead } from '../../jsx-ast/utils/synthetic/synthetic.mjs';

/**
 * Whether a page's content belongs on `all.html`: the module pages, minus the
 * index. Chunk pages and the other synthetic pages are left out, since the full
 * module pages already carry their content.
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} data
 */
const isModulePage = data =>
  !data.synthetic && !data.chunk && data.api !== 'index';

/**
 * Builds the `all.html` page from the module pages already generated.
 *
 * Its content is exactly the module pages' content, one after the other, so
 * nothing is rebuilt: the page program imports each module's `content` export
 * (see `buildPageProgram`) and the table of contents is the modules' own,
 * concatenated. Modules are ordered as the sidebar lists them.
 *
 * @param {Array<import('../../jsx-ast/types').PageCode>} pages - Every generated page
 * @returns {import('../types').ComposedPage}
 */
export const buildAllPage = pages => {
  const byApi = new Map(pages.map(page => [page.data.api, page]));

  const modules = pages.map(({ data }) => data).filter(isModulePage);
  const parts = getSortedHeadNodes(modules).map(({ api }) => byApi.get(api));

  return {
    data: createSyntheticHead('all', 'All'),
    headings: parts.flatMap(({ headings }) => headings),
    parts: parts.map(({ data }) => data.api),
  };
};
