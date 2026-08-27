import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  build as viteBuild,
  defaultClientConditions,
  defaultServerConditions,
  mergeConfig,
} from 'vite';

import { FONT_DIRECTORY } from '../constants.mjs';
import { createPageMinifier } from '../utils/minify.mjs';

const VIRTUAL_PREFIX = 'virtual:doc-kit/';
const RESOLVED_VIRTUAL_PREFIX = '\0doc-kit:';
const PACKAGE_ANCHOR = fileURLToPath(import.meta.url);

// The single client entry every HTML page loads. One identifier means one
// entry chunk (plus its shared dependencies) for the whole site, rather than
// a copy per page.
const CLIENT_ENTRY_ID = `${VIRTUAL_PREFIX}client/index.jsx`;

/**
 * Resolves a package specifier
 */
const resolveFromPackage = specifier =>
  fileURLToPath(import.meta.resolve(specifier));

/**
 * Resolves relative theme aliases against Vite's configured project root.
 *
 * @param {Record<string, string>} aliases
 * @param {string} root
 * @returns {Record<string, string>}
 */
const resolveThemeAliases = (aliases, root) =>
  Object.fromEntries(
    Object.entries(aliases).map(([find, replacement]) => [
      find,
      replacement.startsWith('.') ? resolve(root, replacement) : replacement,
    ])
  );

/**
 * Creates a Vite plugin that serves an exact map of in-memory modules and HTML
 * entries. HTML keeps its absolute identifier so Vite emits it at the matching
 * path relative to the configured root.
 *
 * @param {Map<string, string>} sources
 * @returns {import('vite').Plugin}
 */
export const createVirtualModulesPlugin = sources => {
  // Package imports are anchored to the same importer whichever virtual
  // module they come from, so each specifier resolves the same way every
  // time: resolve it once, not once per page that imports it.
  const anchored = new Map();

  return {
    name: 'doc-kit:virtual-modules',
    enforce: 'pre',
    /**
     * Resolves an exact in-memory identifier, or anchors a virtual module's
     * package imports to this package.
     *
     * @param {string} id
     * @param {string} [importer]
     * @returns {string|Promise<import('vite').Rollup.ResolvedId|null>|undefined}
     */
    resolveId(id, importer) {
      if (sources.has(id)) {
        return isAbsolute(id) && id.endsWith('.html')
          ? id
          : `${RESOLVED_VIRTUAL_PREFIX}${id}`;
      }

      if (
        importer?.startsWith(RESOLVED_VIRTUAL_PREFIX) &&
        !id.startsWith(VIRTUAL_PREFIX) &&
        /^[@\w]/.test(id)
      ) {
        if (!anchored.has(id)) {
          anchored.set(
            id,
            this.resolve(id, PACKAGE_ANCHOR, { skipSelf: true })
          );
        }

        return anchored.get(id);
      }
    },
    /**
     * Loads an exact resolved identifier.
     *
     * @param {string} id
     * @returns {string|undefined}
     */
    load(id) {
      return sources.get(
        id.startsWith(RESOLVED_VIRTUAL_PREFIX)
          ? id.slice(RESOLVED_VIRTUAL_PREFIX.length)
          : id
      );
    },
  };
};

/**
 * Finalizes Vite's generated HTML before its normal write phase.
 *
 * @param {import('../types').ClientBundleOptions['minifyPages']} minifyPages
 * @returns {import('vite').Plugin}
 */
const createHTMLFinalizerPlugin = minifyPages => ({
  name: 'doc-kit:finalize-html',
  /**
   * Minifies every generated HTML entry after Vite has injected its scripts,
   * stylesheets, and module preloads. The pages are handed over as one batch
   * so the minifier can spread them across the worker pool.
   */
  generateBundle: {
    order: 'post',
    /**
     * @param {object} _
     * @param {Record<string, object>} bundle
     */
    async handler(_, bundle) {
      const assets = Object.values(bundle).filter(
        item => item.type === 'asset' && item.fileName.endsWith('.html')
      );

      const minified = await minifyPages(
        new Map(
          assets.map(asset => [
            asset.fileName,
            typeof asset.source === 'string'
              ? asset.source
              : Buffer.from(asset.source).toString('utf8'),
          ])
        )
      );

      for (const asset of assets) {
        asset.source = minified.get(asset.fileName);
      }
    },
  },
});

/**
 * Converts generated page programs into named Vite inputs and virtual modules
 * for the SSR build: each page needs a distinct virtual JSX path of its own.
 *
 * @param {Map<string, string>} codeMap
 */
const createServerEntries = codeMap => {
  const input = {};
  const sources = new Map();

  for (const [fileName, code] of codeMap) {
    const id = `${VIRTUAL_PREFIX}server/${fileName}`;

    input[basename(fileName, '.jsx')] = id;
    sources.set(id, code);
  }

  return { input, sources };
};

/**
 * Produces the complete inline Vite config for one generator build.
 * User configuration is merged first; generator invariants are then applied.
 *
 * @param {object} options
 * @param {Map<string, string>} options.sources
 * @param {Record<string, string>|Array<string>} options.input
 * @param {boolean} options.server
 * @param {string} [options.serverOutDir]
 * @param {import('../types').ClientBundleOptions['minifyPages']} [options.minifyPages]
 * @param {import('../types').ResolvedWebConfiguration} options.config
 * @param {import('vite').UserConfig} options.vite
 * @returns {import('vite').InlineConfig}
 */
export const createViteConfig = ({
  sources,
  input,
  server,
  serverOutDir,
  minifyPages = createPageMinifier(),
  config: webConfig,
  vite = {},
}) => {
  const root = resolve(vite.root ?? process.cwd());
  const conditions = server ? defaultServerConditions : defaultClientConditions;

  return {
    ...vite,

    // The generator is the complete Vite configuration boundary.
    configFile: false,
    root,
    base: webConfig.useAbsoluteURLs
      ? String(webConfig.baseURL).replace(/\/?$/, '/')
      : './',
    appType: 'custom',
    publicDir: false,
    clearScreen: vite.clearScreen ?? false,
    logLevel: vite.logLevel ?? 'warn',

    // Virtual entries must resolve before user plugins, while user plugins can
    // still transform every module and generated HTML page.
    plugins: [
      createVirtualModulesPlugin(sources),
      ...(vite.plugins ?? []),
      ...(!server && webConfig.minify
        ? [createHTMLFinalizerPlugin(minifyPages)]
        : []),
    ],

    resolve: mergeConfig(
      { resolve: vite.resolve },
      {
        resolve: {
          conditions: ['rolldown', ...conditions],
          dedupe: ['preact'],

          alias: {
            'react/jsx-runtime': resolveFromPackage(
              'preact/compat/jsx-runtime'
            ),
            'react/jsx-dev-runtime': resolveFromPackage(
              'preact/compat/jsx-dev-runtime'
            ),
            'react-dom/client': resolveFromPackage('preact/compat/client'),
            'react-dom/server': resolveFromPackage('preact/compat/server'),
            'react-dom/test-utils': resolveFromPackage(
              'preact/compat/test-utils'
            ),
            'react-dom': resolveFromPackage('preact/compat'),
            react: resolveFromPackage('preact/compat'),
            ...resolveThemeAliases(webConfig.imports, root),
          },
        },
      }
    ).resolve,

    // Oxc supplies Preact's automatic JSX runtime in both builds.
    oxc: {
      ...vite.oxc,
      jsx: {
        ...vite.oxc?.jsx,
        runtime: 'automatic',
        importSource: 'preact',
      },
    },

    // CSS imports, modules, URLs, splitting, and minification are all Vite
    // responsibilities. Native Lightning CSS options remain configurable.
    css: {
      ...vite.css,
      transformer: 'lightningcss',
    },

    build: {
      ...vite.build,

      // Both builds are complete Vite outputs. SSR uses a private directory
      // because its entries can share chunks; the client writes the final site.
      outDir: server ? serverOutDir : resolve(webConfig.output),
      write: true,
      emptyOutDir: false,
      copyPublicDir: false,
      watch: null,
      lib: false,

      ...(server ? { manifest: false } : {}),
      ssr: server,

      // Islands make split CSS wrong: a component's stylesheet would arrive
      // with the chunk that hydrates it, long after the server-rendered markup
      // it styles is on screen. One stylesheet keeps the page styled from the
      // first paint, whenever — or whether — its islands load.
      ...(server ? {} : { cssCodeSplit: false }),

      // Browser output follows the generator's minification setting. Temporary
      // server output stays readable and disappears immediately after render.
      minify: server ? false : (vite.build?.minify ?? webConfig.minify),

      rolldownOptions: {
        ...vite.build?.rolldownOptions,
        input,
        ...(server ? { external: [] } : {}),
        output: {
          ...vite.build?.rolldownOptions?.output,
          format: 'es',

          /**
           * Determine the asset names for different files
           */
          assetFileNames: asset =>
            asset.names.some(name => name.endsWith('.woff2'))
              ? // We need to know where the fonts are to preload
                // them. Using a dynamic hash would make this
                // difficult.
                `${FONT_DIRECTORY}/[name][extname]`
              : 'assets/[name]-[hash][extname]',

          ...(server
            ? {
                entryFileNames: '[name].mjs',
                chunkFileNames: 'assets/[name]-[hash].mjs',
              }
            : {}),
        },
      },
    },

    ...(server
      ? {
          ssr: {
            ...vite.ssr,
            external: [],
            noExternal: true,
            resolve: {
              ...vite.ssr?.resolve,
              conditions: [
                'rolldown',
                ...defaultServerConditions,
                ...(vite.ssr?.resolve?.conditions ?? []),
              ],
            },
          },
        }
      : {}),
  };
};

/**
 * Builds and executes the server entries through Vite's SSR pipeline.
 *
 * @param {object} options
 * @param {Map<string, string>} options.entries
 * @param {Record<string, string>} options.virtualImports
 * @param {import('../types').ResolvedWebConfiguration} options.config
 * @param {import('vite').UserConfig} options.vite
 * @param {() => Promise<string>} [options.createTemporaryDirectory]
 * @returns {Promise<Map<string, string>>}
 */
export const render = async ({
  entries,
  virtualImports,
  createTemporaryDirectory = () => mkdtemp(join(tmpdir(), 'doc-kit-vite-ssr-')),
  config,
  vite = {},
}) => {
  const { input, sources } = createServerEntries(entries);

  for (const [id, code] of Object.entries(virtualImports)) {
    sources.set(id, code);
  }

  // Vite writes the compiled SSR renderers here so Node can import and execute
  // them without mixing intermediate modules into the final site. The directory
  // is removed after rendering
  const temporaryDirectory = await createTemporaryDirectory();

  try {
    await viteBuild(
      createViteConfig({
        sources,
        input,
        server: true,
        serverOutDir: temporaryDirectory,
        config,
        vite,
      })
    );

    const pages = new Map();

    await Promise.all(
      Object.keys(input).map(async name => {
        const module = await import(
          pathToFileURL(join(temporaryDirectory, `${name}.mjs`)).href
        );

        pages.set(name, await module.default());
      })
    );

    return pages;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

/**
 * Lets Vite transform the rendered pages as HTML entries. Vite injects their
 * hashed scripts, stylesheets, and module preloads, then writes the site.
 *
 * @param {object} options
 * @param {string} options.entry
 * @param {Record<string, string>} options.virtualImports
 * @param {Map<string, string>} options.pages
 * @param {import('../types').ClientBundleOptions['minifyPages']} [options.minifyPages]
 * @param {import('../types').ResolvedWebConfiguration} options.config
 * @param {import('vite').UserConfig} options.vite
 * @returns {Promise<void>}
 */
export const build = async ({
  entry,
  virtualImports,
  pages,
  minifyPages,
  config,
  vite = {},
}) => {
  const sources = new Map([[CLIENT_ENTRY_ID, entry]]);
  const root = resolve(vite.root ?? process.cwd());
  const input = [];

  for (const [fileName, html] of pages) {
    const id = resolve(root, fileName);
    input.push(id);
    sources.set(id, html);
  }

  for (const [id, code] of Object.entries(virtualImports)) {
    sources.set(id, code);
  }

  await viteBuild(
    createViteConfig({
      sources,
      input,
      server: false,
      minifyPages,
      config,
      vite,
    })
  );
};

/**
 * Creates the default Vite implementation of the web bundler contract.
 *
 * @param {import('vite').UserConfig} [options]
 * @returns {import('../types').WebBundler}
 */
export const createViteBundler = (options = {}) => ({
  /**
   * The client entry every page loads.
   */
  getEntryId: () => CLIENT_ENTRY_ID,
  /**
   * Runs the Vite server build.
   *
   * @param {import('../types').ServerBundleOptions} context
   */
  render: context => render({ ...context, vite: options }),
  /**
   * Runs the Vite client build.
   *
   * @param {import('../types').ClientBundleOptions} context
   */
  build: context => build({ ...context, vite: options }),
});
