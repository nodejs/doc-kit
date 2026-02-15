'use strict';

/**
 * Wraps a dynamic import into a lazy loader that resolves to the default export.
 *
 * @template T
 * @param {() => Promise<{default: T}>} loader
 * @returns {() => Promise<T>}
 */
const lazyDefault = loader => () => loader().then(m => m.default);

export const publicGenerators = {
  'json-simple': lazyDefault(() => import('./json-simple/index.mjs')),
  'legacy-html': lazyDefault(() => import('./legacy-html/index.mjs')),
  'legacy-html-all': lazyDefault(() => import('./legacy-html-all/index.mjs')),
  'man-page': lazyDefault(() => import('./man-page/index.mjs')),
  'legacy-json': lazyDefault(() => import('./legacy-json/index.mjs')),
  'legacy-json-all': lazyDefault(() => import('./legacy-json-all/index.mjs')),
  'addon-verify': lazyDefault(() => import('./addon-verify/index.mjs')),
  'api-links': lazyDefault(() => import('./api-links/index.mjs')),
  'orama-db': lazyDefault(() => import('./orama-db/index.mjs')),
  'llms-txt': lazyDefault(() => import('./llms-txt/index.mjs')),
  sitemap: lazyDefault(() => import('./sitemap/index.mjs')),
  web: lazyDefault(() => import('./web/index.mjs')),
};

// These ones are special since they don't produce standard output,
// and hence, we don't expose them to the CLI.
const internalGenerators = {
  ast: lazyDefault(() => import('./ast/index.mjs')),
  metadata: lazyDefault(() => import('./metadata/index.mjs')),
  'jsx-ast': lazyDefault(() => import('./jsx-ast/index.mjs')),
  'ast-js': lazyDefault(() => import('./ast-js/index.mjs')),
};

export const allGenerators = {
  ...publicGenerators,
  ...internalGenerators,
};
