import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  build as viteBuild,
  mergeConfig,
} from 'vite';

import { minifyHTML } from '../../../utils/html-minifier.mjs';

const VIRTUAL_PREFIX = 'virtual:doc-kit/';
const RESOLVED_VIRTUAL_PREFIX = '\0doc-kit:';

/**
 * Returns the virtual Vite client entry imported by one HTML page.
 *
 * @param {string} api
 * @returns {string}
 */
const getViteEntryId = api => `${VIRTUAL_PREFIX}client/${api}.jsx`;

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
  return {
    name: 'doc-kit:virtual-modules',
    enforce: 'pre',
    /**
     * Resolves an exact in-memory identifier.
     *
     * @param {string} id
     * @returns {string|undefined}
     */
    resolveId(id) {
      if (sources.has(id)) {
        return isAbsolute(id) && id.endsWith('.html')
          ? id
          : `${RESOLVED_VIRTUAL_PREFIX}${id}`;
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
 * @returns {import('vite').Plugin}
 */
const createHTMLFinalizerPlugin = () => ({
  name: 'doc-kit:finalize-html',
  /**
   * Minifies every generated HTML entry after Vite has injected its scripts,
   * stylesheets, and module preloads.
   */
  generateBundle: {
    order: 'post',
    /**
     * @param {object} _
     * @param {Record<string, object>} bundle
     */
    async handler(_, bundle) {
      await Promise.all(
        Object.values(bundle)
          .filter(
            item => item.type === 'asset' && item.fileName.endsWith('.html')
          )
          .map(async asset => {
            const source =
              typeof asset.source === 'string'
                ? asset.source
                : Buffer.from(asset.source).toString('utf8');

            asset.source = await minifyHTML(source);
          })
      );
    },
  },
});

/**
 * Converts generated page programs into named Vite inputs and virtual modules.
 *
 * @param {Map<string, string>} codeMap
 * @param {'client'|'server'} environment
 */
const createBuildEntries = (codeMap, environment) => {
  const input = {};
  const sources = new Map();

  for (const [fileName, code] of codeMap) {
    const name = basename(fileName, '.jsx');
    const id =
      environment === 'client'
        ? getViteEntryId(name)
        : `${VIRTUAL_PREFIX}server/${fileName}`;

    input[name] = id;
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
 * @param {import('../types').ResolvedWebConfiguration} options.config
 * @param {import('vite').UserConfig} options.vite
 * @returns {import('vite').InlineConfig}
 */
export const createViteConfig = ({
  sources,
  input,
  server,
  serverOutDir,
  config: webConfig,
  vite = {},
}) => {
  const root = resolve(vite.root ?? process.cwd());

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
      ...(!server && webConfig.minify ? [createHTMLFinalizerPlugin()] : []),
    ],

    resolve: mergeConfig(
      { resolve: vite.resolve },
      {
        resolve: {
          dedupe: ['preact'],

          // Vite applies string aliases to matching package subpaths too.
          alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
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

      ssr: server,

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
  const { input, sources } = createBuildEntries(entries, 'server');

  for (const [id, code] of Object.entries(virtualImports)) {
    sources.set(id, code);
  }

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
 * @param {Map<string, string>} options.entries
 * @param {Record<string, string>} options.virtualImports
 * @param {Map<string, string>} options.pages
 * @param {import('../types').ResolvedWebConfiguration} options.config
 * @param {import('vite').UserConfig} options.vite
 * @returns {Promise<void>}
 */
export const build = async ({
  entries,
  virtualImports,
  pages,
  config,
  vite = {},
}) => {
  const { sources } = createBuildEntries(entries, 'client');
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
  getEntryId: getViteEntryId,
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
