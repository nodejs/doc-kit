'use strict';

/**
 * Maps the shorthand names accepted by the CLI and configuration files
 * (e.g. `--target html`) to the import specifiers they resolve to.
 *
 * Generators are loaded dynamically by specifier (see `./loader.mjs`), so this
 * module must not import any generator code — it is purely a lookup table.
 * Anything that is not listed here is treated as a raw import specifier,
 * which is how third-party generator packages are loaded.
 */
export const publicGenerators = {
  'json-simple': '@node-core/doc-kit/json-simple',
  'legacy-html': '@nodejs/doc-kit-generator-legacy/legacy-html',
  'legacy-html-all': '@nodejs/doc-kit-generator-legacy/legacy-html-all',
  'man-page': '@node-core/doc-kit/man-page',
  'legacy-json': '@nodejs/doc-kit-generator-legacy/legacy-json',
  'legacy-json-all': '@nodejs/doc-kit-generator-legacy/legacy-json-all',
  'addon-verify': '@node-core/doc-kit/addon-verify',
  'api-links': '@node-core/doc-kit/api-links',
  'orama-db': '@nodejs/doc-kit-generator-react/orama-db',
  'llms-txt': '@nodejs/doc-kit-generator-react/llms-txt',
  sitemap: '@nodejs/doc-kit-generator-react/sitemap',
  html: '@nodejs/doc-kit-generator-react/html',
};

// These ones are special since they don't produce standard output,
// and hence, we don't expose them to the CLI. They can still be referenced
// by shorthand (e.g. as configuration keys or generator dependencies).
const internalGenerators = {
  ast: '@node-core/doc-kit/ast',
  metadata: '@node-core/doc-kit/metadata',
  'jsx-ast': '@nodejs/doc-kit-generator-react/jsx-ast',
  'ast-js': '@node-core/doc-kit/ast-js',
};

// Former names kept resolvable for existing invocations and config files.
// Unlike the maps above, keys here intentionally differ from the generator's
// `name` property.
export const deprecatedGenerators = {
  web: '@nodejs/doc-kit-generator-react/html',
};

export const allGenerators = {
  ...publicGenerators,
  ...internalGenerators,
  ...deprecatedGenerators,
};
