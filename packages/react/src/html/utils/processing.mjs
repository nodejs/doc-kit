import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';

import createConfigSource from './config.mjs';
import createProgramBuilder from './generate.mjs';
import { relativeOrAbsolute } from './relativeOrAbsolute.mjs';
import { resolveBundler } from '../bundlers/index.mjs';
import { FONT_DIRECTORY, FONTS, SPECULATION_RULES } from '../constants.mjs';
import { THEME_SCRIPT } from '../ui/theme-script.mjs';

/**
 * Creates the virtual imports for one bundle target.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} datas - Per-page metadata
 * @param {Record<string, string>} virtualImports
 * @param {boolean} server
 * @returns {Record<string, string>}
 */
const createVirtualImports = (datas, virtualImports, server) => ({
  ...virtualImports,
  '#theme/config': createConfigSource(datas, server),
});

/**
 * Populates a template string by evaluating it as a JavaScript template literal,
 * allowing full JS expression syntax (e.g., ${if ...}, ${JSON.stringify(...)}).
 *
 * ONLY used for HTML template population. Do not use elsewhere.
 *
 * @param {string} template - The template string with ${...} placeholders
 * @param {Record<string, unknown>} config - The values available in the template
 * @returns {string} The populated template
 */
export const populateWithEvaluation = (template, config) => {
  const keys = Object.keys(config);
  const values = Object.values(config);
  const fn = new Function(...keys, `return \`${template}\`;`);
  return fn(...values);
};

/**
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} data
 * @returns {string}
 */
export const resolvePageRoot = data => {
  if (data.synthetic === true) {
    const { baseURL, useAbsoluteURLs } = getConfig('html');
    return useAbsoluteURLs ? String(baseURL).replace(/\/?$/, '/') : '/';
  }

  const unresolvedRoot = relativeOrAbsolute('/', data.path);
  return unresolvedRoot.endsWith('/') ? unresolvedRoot : `${unresolvedRoot}/`;
};

/**
 * Escapes text for interpolation into HTML, as element content or as a quoted
 * attribute value: a heading such as `What does it mean to "contextify" an
 * object?` must not terminate the `<meta content="...">` it is rendered into.
 *
 * @param {string} text
 * @returns {string}
 */
export const escapeHTML = text =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Renders a self-closing HTML tag from an attribute bag.
 *
 * Boolean `true` renders a valueless attribute (e.g. `crossorigin`); `false`,
 * `null`, and `undefined` are omitted; all other values are stringified.
 *
 * @param {string} tag - The tag name (e.g. `'meta'`, `'link'`).
 * @param {Record<string, unknown>} attrs - Attribute name/value pairs.
 * @returns {string} The rendered tag.
 */
const renderTag = (tag, attrs) => {
  const rendered = Object.entries(attrs)
    .filter(([, value]) => value != null && value !== false)
    .map(([key, value]) => (value === true ? ` ${key}` : ` ${key}="${value}"`))
    .join('');

  return `<${tag}${rendered} />`;
};

/**
 * Renders the preload hints for a page
 */
export const buildPreloads = root =>
  FONTS.map(font =>
    renderTag('link', {
      rel: 'preload',
      href: `${root}${FONT_DIRECTORY}/${font}`,
      as: 'font',
      type: 'font/woff2',
      crossorigin: true,
    })
  ).join('\n  ');

/**
 * Builds the configurable `<head>` markup shared by every page from the
 * structured `head` config: `<meta>` tags, `<link>` tags, and raw HTML. None
 * of the rendered content is project-specific beyond the configured values.
 *
 * @param {import('../types').Configuration['head']} head - The `head` config.
 * @returns {string} The concatenated HTML for the document head.
 */
export const buildHead = ({ meta = [], links = [], html = [] }) =>
  [
    ...meta.map(attrs => renderTag('meta', attrs)),
    ...links.map(attrs => renderTag('link', attrs)),
    ...html,
  ].join('\n  ');

/**
 * Creates an accumulator that wraps per-page JSX code into server and client
 * programs one at a time. The JSX AST has already been serialized to a code
 * string upstream (in the `jsx-ast` worker), so the heavy AST never reaches
 * the main thread — only the code string and page metadata stream in here.
 *
 * @returns {{ add: (item: { data: import('@doc-kit/core/generators/metadata/types').MetadataEntry, code: string }) => void, serverCodeMap: Map<string, string>, clientProgram: string }}
 */
export function createCodeConverter() {
  const { buildServerProgram, clientProgram } = createProgramBuilder();

  const serverCodeMap = new Map();

  return {
    /**
     * Records the server program for a single page's JSX code.
     *
     * @param {{ data: import('@doc-kit/core/generators/metadata/types').MetadataEntry, code: string }} item
     */
    add: ({ data, code }) => {
      // Prepare code for server-side execution (wrapped for SSR)
      serverCodeMap.set(`${data.api}.jsx`, buildServerProgram(code));
    },
    serverCodeMap,
    // The client entry is the same module for every page: the pages differ
    // only in their server-rendered markup, which the entry hydrates.
    clientProgram,
  };
}

/**
 * Bundles pre-converted JSX code into complete HTML pages and client assets.
 * Conversion (JSX AST → code) happens upstream via
 * {@link createCodeConverter} so the heavy ASTs are already discarded; this
 * step needs every entry together for code-splitting and the shared sidebar.
 *
 * @param {object} params
 * @param {Map<string, string>} params.serverCodeMap - Server-side code per page.
 * @param {string} params.clientProgram - The client entry shared by every page.
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} params.datas - Per-page metadata, in render order.
 * @param {string} params.template - The HTML template string for the output pages.
 * @param {import('../types').ClientBundleOptions['minifyPages']} params.minifyPages - Minifies the final pages, off the main thread.
 */
export async function processBundles({
  serverCodeMap,
  clientProgram,
  datas,
  template,
  minifyPages,
}) {
  const config = getConfig('html');
  const bundler = await resolveBundler(config.bundler);

  const serverPages = await bundler.render({
    entries: serverCodeMap,
    virtualImports: createVirtualImports(datas, config.virtualImports, true),
    config,
  });

  const titleSuffix = populate(config.title, {
    ...config,
    version: config.version.version,
  });

  // Pre-render the configurable `<head>` markup once, since it is identical
  // across every page. Computed here (rather than inline in the template) so
  // template authors avoid nested template-literal escaping.
  const head = buildHead(config.head);

  // Render the templates with the client identifier supplied by the adapter.
  // The adapter then owns scripts, stylesheets, preloads, and imported assets.
  const entrypoint = bundler.getEntryId();

  const pages = new Map(
    datas.map(data => {
      const root = resolvePageRoot(data);
      const title = data.title ?? data.heading.data.name;
      const fileName = `${data.path.replace(/^\/+/, '')}.html`;

      return [
        fileName,
        populateWithEvaluation(template, {
          title: escapeHTML(
            title
              ? titleSuffix
                ? `${title} | ${titleSuffix}`
                : title
              : titleSuffix
          ),
          dehydrated: serverPages.get(data.api) ?? '',
          entrypoint,
          speculationRules: SPECULATION_RULES,
          themeScript: THEME_SCRIPT,
          preloads: buildPreloads(root),
          root,
          metadata: data,
          config,
          head,
        }),
      ];
    })
  );

  await bundler.build({
    entry: clientProgram,
    virtualImports: createVirtualImports(datas, config.virtualImports, false),
    pages,
    minifyPages,
    config,
  });
}
