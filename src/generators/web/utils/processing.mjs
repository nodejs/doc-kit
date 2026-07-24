import createConfigSource from './config.mjs';
import createASTBuilder from './generate.mjs';
import { relativeOrAbsolute } from './relativeOrAbsolute.mjs';
import getConfig from '../../../utils/configuration/index.mjs';
import { populate } from '../../../utils/configuration/templates.mjs';
import { resolveBundler } from '../bundlers/index.mjs';
import { SPECULATION_RULES } from '../constants.mjs';
import { THEME_SCRIPT } from '../ui/theme-script.mjs';

/**
 * Creates the virtual imports for one bundle target.
 *
 * @param {Array<{ data: import('../../metadata/types').MetadataEntry }>} sidebarEntries
 * @param {Record<string, string>} virtualImports
 * @param {boolean} server
 * @returns {Record<string, string>}
 */
const createVirtualImports = (sidebarEntries, virtualImports, server) => ({
  ...virtualImports,
  '#theme/config': createConfigSource(sidebarEntries, server),
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
 * @param {import('../../metadata/types').MetadataEntry} data
 * @returns {string}
 */
export const resolvePageRoot = data => {
  if (data.synthetic === true) {
    const { baseURL, useAbsoluteURLs } = getConfig('web');
    return useAbsoluteURLs ? String(baseURL).replace(/\/?$/, '/') : '/';
  }

  const unresolvedRoot = relativeOrAbsolute('/', data.path);
  return unresolvedRoot.endsWith('/') ? unresolvedRoot : `${unresolvedRoot}/`;
};

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
 * @returns {{ add: (item: { data: import('../../metadata/types').MetadataEntry, code: string }) => void, serverCodeMap: Map<string, string>, clientCodeMap: Map<string, string> }}
 */
export function createCodeConverter() {
  const { buildServerProgram, buildClientProgram } = createASTBuilder();

  const serverCodeMap = new Map();
  const clientCodeMap = new Map();

  return {
    /**
     * Records the server/client programs for a single page's JSX code.
     *
     * @param {{ data: import('../../metadata/types').MetadataEntry, code: string }} item
     */
    add: ({ data, code }) => {
      const fileName = `${data.api}.jsx`;

      // Prepare code for server-side execution (wrapped for SSR)
      serverCodeMap.set(fileName, buildServerProgram(code));

      // Prepare code for client-side execution (wrapped for hydration)
      clientCodeMap.set(fileName, buildClientProgram(code));
    },
    serverCodeMap,
    clientCodeMap,
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
 * @param {Map<string, string>} params.clientCodeMap - Client-side code per page.
 * @param {Array<import('../../metadata/types').MetadataEntry>} params.datas - Per-page metadata, in render order.
 * @param {Array<{ data: import('../../metadata/types').MetadataEntry }>} params.sidebarEntries - Entries used to build the sidebar page list (real module pages only).
 * @param {string} params.template - The HTML template string for the output pages.
 */
export async function processBundles({
  serverCodeMap,
  clientCodeMap,
  datas,
  sidebarEntries,
  template,
}) {
  const config = getConfig('web');
  const bundler = await resolveBundler(config.bundler);

  const serverPages = await bundler.render({
    entries: serverCodeMap,
    virtualImports: createVirtualImports(
      sidebarEntries,
      config.virtualImports,
      true
    ),
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

  // Render the templates with the client identifiers supplied by the adapter.
  // The adapter then owns scripts, stylesheets, preloads, and imported assets.
  const pages = new Map(
    datas.map(data => {
      const root = resolvePageRoot(data);
      const title = data.title ?? data.heading.data.name;
      const fileName = `${data.path.replace(/^\/+/, '')}.html`;

      return [
        fileName,
        populateWithEvaluation(template, {
          title: title
            ? titleSuffix
              ? `${title} | ${titleSuffix}`
              : title
            : titleSuffix,
          dehydrated: serverPages.get(data.api) ?? '',
          entrypoint: bundler.getEntryId(data.api),
          speculationRules: SPECULATION_RULES,
          themeScript: THEME_SCRIPT,
          root,
          metadata: data,
          config,
          head,
        }),
      ];
    })
  );

  await bundler.build({
    entries: clientCodeMap,
    virtualImports: createVirtualImports(
      sidebarEntries,
      config.virtualImports,
      false
    ),
    pages,
    config,
  });
}
