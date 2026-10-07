'use strict';

import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import { lazy } from './misc.mjs';
import remarkTypeAnnotations from './type-annotations/remark.mjs';

// Nothing in this module loads Shiki: the `ast` and `metadata` stages (and
// every worker that runs them) import it, and none of them highlight code.

/**
 * Retrieves an instance of Remark configured to parse GFM (GitHub Flavored Markdown)
 * plus `{...}` type annotations (see `./type-annotations`), which only exist
 * in non-MDX files — the MDX pipeline below never registers them.
 */
export const getRemark = lazy(() =>
  unified()
    .use(remarkParse)
    .use(remarkTypeAnnotations)
    .use(remarkGfm)
    .use(remarkStringify)
);

/**
 * Retrieves an instance of Remark configured to parse MDX (JSX-in-Markdown).
 *
 * Unlike {@link getRemark}, this understands `<Component />` and `{expression}`
 * syntax as real JSX/expression nodes. It is only used for `.mdx` (or
 * explicitly opted-in) files, since Node.js core `.md` files use bare `<` and
 * `{` for type annotations that MDX would otherwise try to parse.
 */
export const getRemarkMdx = lazy(() =>
  unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkStringify)
);
