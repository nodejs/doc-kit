'use strict';

/**
 * Maps the shorthand names accepted by the CLI and configuration files
 * (e.g. `--target web`) to the import specifiers they resolve to.
 *
 * Generators are loaded dynamically by specifier (see `./loader.mjs`), so this
 * module must not import any generator code — it is purely a lookup table.
 * Anything that is not listed here is treated as a raw import specifier,
 * which is how third-party generator packages are loaded.
 */
export const publicGenerators = {
  'json-simple': '@node-core/doc-kit/json-simple',
  'legacy-html': '@node-core/doc-kit/legacy-html',
  'legacy-html-all': '@node-core/doc-kit/legacy-html-all',
  'man-page': '@node-core/doc-kit/man-page',
  'legacy-json': '@node-core/doc-kit/legacy-json',
  'legacy-json-all': '@node-core/doc-kit/legacy-json-all',
  'addon-verify': '@node-core/doc-kit/addon-verify',
  'api-links': '@node-core/doc-kit/api-links',
  'orama-db': '@node-core/doc-kit/orama-db',
  'llms-txt': '@node-core/doc-kit/llms-txt',
  sitemap: '@node-core/doc-kit/sitemap',
  web: '@node-core/doc-kit/web',
};

// These ones are special since they don't produce standard output,
// and hence, we don't expose them to the CLI. They can still be referenced
// by shorthand (e.g. as configuration keys or generator dependencies).
const internalGenerators = {
  ast: '@node-core/doc-kit/ast',
  metadata: '@node-core/doc-kit/metadata',
  'jsx-ast': '@node-core/doc-kit/jsx-ast',
  'ast-js': '@node-core/doc-kit/ast-js',
};

export const allGenerators = {
  ...publicGenerators,
  ...internalGenerators,
};
