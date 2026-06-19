import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

import { transform } from 'lightningcss-wasm';

import bundleCode from './bundle.mjs';
import { createChunkedRequire } from './chunks.mjs';
import createConfigSource from './config.mjs';
import createASTBuilder from './generate.mjs';
import { relativeOrAbsolute } from './relativeOrAbsolute.mjs';
import getConfig from '../../../utils/configuration/index.mjs';
import { populate } from '../../../utils/configuration/templates.mjs';
import { minifyHTML } from '../../../utils/html-minifier.mjs';
import { SPECULATION_RULES } from '../constants.mjs';
import { THEME_SCRIPT } from '../ui/theme-script.mjs';

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
 * Bundles and executes server-side code, returning dehydrated HTML pages.
 *
 * @param {Map<string, string>} serverCodeMap - Map of fileName to server-side JavaScript code.
 * @param {ReturnType<import('node:module').createRequire>} requireFn - Node.js require function for external packages.
 * @param {Object} virtualImports - virtual imports to pass to Rolldown
 * @returns {{ pages: Map<string, string>, css: string }}
 */
async function executeServerCode(serverCodeMap, requireFn, virtualImports) {
  // Bundle all server-side code, which may produce code-split chunks
  const { chunks, css } = await bundleCode(serverCodeMap, virtualImports, {
    server: true,
  });

  const entryChunks = chunks.filter(c => c.isEntry);
  const otherChunks = chunks.filter(c => !c.isEntry);

  // Create enhanced require function that can resolve code-split chunks
  const enhancedRequire = createChunkedRequire(otherChunks, requireFn);

  const pages = new Map();

  // Execute each bundled entry and collect dehydrated HTML results
  for (const chunk of entryChunks) {
    const executedFunction = new Function('require', chunk.code);
    const dehydratedHtml = await executedFunction(enhancedRequire);
    pages.set(chunk.fileName, dehydratedHtml);
  }

  return { pages, css };
}

/**
 * Bundles pre-converted JSX code into complete HTML pages, client JS bundles,
 * and CSS. Conversion (JSX AST → code) happens upstream via
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
  const requireFn = createRequire(import.meta.url);
  const virtualImports = {
    '#theme/config': createConfigSource(sidebarEntries),
    ...config.virtualImports,
  };

  // Bundle server and client code in parallel. Both need all entries for
  // code-splitting, but are independent of each other.
  const [serverBundle, clientBundle] = await Promise.all([
    executeServerCode(serverCodeMap, requireFn, virtualImports),
    bundleCode(clientCodeMap, virtualImports),
  ]);

  const titleSuffix = populate(config.title, {
    ...config,
    version: config.version.version,
  });

  // Pre-render the configurable `<head>` markup once, since it is identical
  // across every page. Computed here (rather than inline in the template) so
  // template authors avoid nested template-literal escaping.
  const head = buildHead(config.head);

  // Render final HTML pages
  const results = await Promise.all(
    datas.map(async data => {
      const root = resolvePageRoot(data);

      // Replace template placeholders with actual content
      const renderedHtml = populateWithEvaluation(template, {
        title: data.heading.data.name
          ? `${data.heading.data.name} | ${titleSuffix}`
          : titleSuffix,
        dehydrated: serverBundle.pages.get(`${data.api}.js`) ?? '',
        importMap: clientBundle.importMap?.replaceAll('/', root) ?? '',
        entrypoint: `${data.api}.js?${randomUUID()}`,
        speculationRules: SPECULATION_RULES,
        themeScript: THEME_SCRIPT,
        root,
        metadata: data,
        config,
        head,
      });

      return { html: await minifyHTML(renderedHtml), path: data.path };
    })
  );

  const { code: minifiedCSS } = transform({
    code: Buffer.from(`${serverBundle.css}\n${clientBundle.css}`),
    minify: true,
  });

  return { results, chunks: clientBundle.chunks, css: minifiedCSS };
}
