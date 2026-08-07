import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, resolve as resolvePath } from 'node:path';

import { combine, hashData, hashValue } from '@nodejs/doc-kit/cache/hash.mjs';
import { getBuildCache } from '@nodejs/doc-kit/cache/index.mjs';
import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';
import { populate } from '@nodejs/doc-kit/utils/configuration/templates.mjs';

import createConfigSource from './config.mjs';
import createProgramBuilder from './generate.mjs';
import { relativeOrAbsolute } from './relativeOrAbsolute.mjs';
import { resolveBundler } from '../bundlers/index.mjs';
import { SPECULATION_RULES } from '../constants.mjs';
import { THEME_SCRIPT } from '../ui/theme-script.mjs';

const GENERATOR_SPECIFIER = '@nodejs/doc-kit-generator-react/html';

/**
 * Runtime dependencies whose versions shape server-rendered output but sit
 * outside this package's own salt (installed separately, version ranges).
 */
const RUNTIME_DEPS = ['preact', 'preact-render-to-string', 'vite'];

const require = createRequire(import.meta.url);

/**
 * Identity of everything the SSR output depends on beyond the page's own
 * code: the server `#theme/config` virtual module (page list, versions,
 * config), user virtual imports, theme-override import files (by content),
 * and runtime dependency versions. Returns null when any theme import cannot
 * be content-hashed (e.g. a directory alias) — unknown inputs make SSR
 * results uncacheable, never silently stale.
 *
 * @param {import('../types').ResolvedWebConfiguration} config - The html configuration
 * @param {Record<string, string>} serverVirtualImports - Server virtual module sources
 * @returns {Promise<string | null>} SSR environment hash, or null
 */
const ssrEnvironmentHash = async (config, serverVirtualImports) => {
  const parts = [hashValue(serverVirtualImports)];

  for (const [name, target] of Object.entries(config.imports ?? {})) {
    if (
      typeof target === 'string' &&
      (target.startsWith('.') || isAbsolute(target))
    ) {
      const content = await readFile(resolvePath(target)).catch(() => null);

      if (content === null) {
        return null;
      }

      parts.push(`${name}:${hashData(content)}`);
    } else {
      parts.push(`${name}:${String(target)}`);
    }
  }

  for (const dep of RUNTIME_DEPS) {
    try {
      parts.push(`${dep}@${require(`${dep}/package.json`).version}`);
    } catch {
      parts.push(`${dep}@unresolved`);
    }
  }

  return hashValue(parts);
};

/**
 * Creates the virtual imports for one bundle target.
 *
 * @param {Array<{ data: import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry }>} sidebarEntries
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
 * @param {import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry} data
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
 * Server-renders every page, serving unchanged pages from the durable cache.
 *
 * A page's dehydrated HTML is a pure function of its code (identified by
 * content hash, whether inline or behind a lazy `codeRef`) and the SSR
 * environment. Only cache misses have their code materialized, get wrapped
 * into server programs, and go through one batched subset SSR build — the
 * SSR bundle has no cross-page hash coupling, so partial input sets are safe.
 *
 * @param {Array<{ data: import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry, code?: string, codeRef?: { contentHash: string, load: () => Promise<string | null> } }>} items - jsx-ast output items
 * @param {Record<string, string>} serverVirtualImports - Server virtual module sources
 * @param {import('../types').ResolvedWebConfiguration} config - The html configuration
 * @param {import('../types').WebBundler} bundler - The resolved bundler
 * @returns {Promise<Map<string, string>>} Dehydrated HTML per page api
 */
const renderServerPages = async (
  items,
  serverVirtualImports,
  config,
  bundler
) => {
  const { buildServerProgram } = createProgramBuilder();
  const buildCache = getBuildCache();

  const environment = buildCache
    ? await ssrEnvironmentHash(config, serverVirtualImports)
    : null;

  const salt = environment && (await buildCache.chainSalt(GENERATOR_SPECIFIER));

  const serverPages = new Map();
  const missEntries = new Map();

  /** @type {Map<string, string>} api → ssr cache key */
  const missKeys = new Map();

  for (const item of items) {
    const { data } = item;

    const contentHash =
      item.code != null ? hashData(item.code) : item.codeRef.contentHash;

    const key = salt && combine('html:ssr', salt, environment, contentHash);
    const hit = key && (await buildCache.store.get(key));

    if (hit !== null && hit !== false && hit !== undefined) {
      serverPages.set(data.api, hit);

      continue;
    }

    const code = item.code ?? (await item.codeRef.load());

    if (code == null) {
      // A concurrent prune raced the lazy reference away — vanishingly rare
      // (touch() refreshes mtimes at check time). Failing loudly here is
      // self-healing: the next run rebuilds the page from source.
      throw new Error(
        `Cached page code for "${data.api}" disappeared mid-run; rerun the build`
      );
    }

    missEntries.set(`${data.api}.jsx`, buildServerProgram(code));

    if (key) {
      missKeys.set(data.api, key);
    }
  }

  if (missEntries.size > 0) {
    const rendered = await bundler.render({
      entries: missEntries,
      virtualImports: serverVirtualImports,
      config,
    });

    for (const [api, html] of rendered) {
      serverPages.set(api, html);

      const key = missKeys.get(api);

      if (key) {
        buildCache.store.put(key, html);
      }
    }
  }

  return serverPages;
};

/**
 * Bundles per-page JSX into complete HTML pages and client assets. Server
 * rendering is per-page cached (see {@link renderServerPages}); the client
 * build always runs over every entry — partial client input sets measurably
 * change chunk hashing, so the whole-graph build is the correctness path and
 * is kept cheap by per-page minify memoization and skipped identical writes.
 *
 * @param {object} params
 * @param {Array<{ data: import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry, code?: string, codeRef?: object }>} params.items - jsx-ast output items, in render order.
 * @param {Array<import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry>} params.datas - Per-page metadata, in render order.
 * @param {Array<{ data: import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry }>} params.sidebarEntries - Entries used to build the sidebar page list (real module pages only).
 * @param {string} params.template - The HTML template string for the output pages.
 */
export async function processBundles({
  items,
  datas,
  sidebarEntries,
  template,
}) {
  const config = getConfig('html');
  const bundler = await resolveBundler(config.bundler);
  const { clientProgram } = createProgramBuilder();

  const serverPages = await renderServerPages(
    items,
    createVirtualImports(sidebarEntries, config.virtualImports, true),
    config,
    bundler
  );

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

  // Every page's client entry is the same program; the bundler emits shared
  // chunks and per-page entry stubs from the full set.
  const clientCodeMap = new Map(
    datas.map(data => [`${data.api}.jsx`, clientProgram])
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
