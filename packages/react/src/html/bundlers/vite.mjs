import { readFile, rm, rmdir } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  build as viteBuild,
  defaultClientConditions,
  defaultServerConditions,
  mergeConfig,
  transformWithOxc,
} from 'vite';

import { FONTS, JSX_PRAGMA, JSX_PRAGMA_FRAG } from '../constants.mjs';

const VIRTUAL_PREFIX = 'virtual:doc-kit/';
const RESOLVED_VIRTUAL_PREFIX = '\0doc-kit:';
const PACKAGE_ANCHOR = fileURLToPath(import.meta.url);

// The single client entry every HTML page loads. One identifier means one
// entry chunk (plus its shared dependencies) for the whole site, rather than
// a copy per page.
const CLIENT_ENTRY_ID = `${VIRTUAL_PREFIX}client/index.jsx`;
const CLIENT_NAME = 'client';

// The server-side component library every page program imports from.
const SERVER_ENTRY_ID = `${VIRTUAL_PREFIX}server/library.jsx`;
const LIBRARY_NAME = 'library';

// Where Vite writes the client manifest the asset tags are read from, unless
// the project asked for a manifest of its own.
const MANIFEST_NAME = '.vite/manifest.json';

// Vite's polyfill for `<link rel="modulepreload">`, for browsers without it.
// Vite adds it by itself to HTML entries; the client is built from a module
// entry instead, so it is imported explicitly to keep the output the same.
const MODULE_PRELOAD_POLYFILL = 'vite/modulepreload-polyfill';

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
 * Creates a Vite plugin that serves an exact map of in-memory modules.
 *
 * @param {Map<string, string>} sources
 * @returns {import('vite').Plugin}
 */
export const createVirtualModulesPlugin = sources => {
  // Package imports are anchored to the same importer whichever virtual
  // module they come from, so each specifier resolves the same way every
  // time: resolve it once, not once per module that imports it.
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
        return `${RESOLVED_VIRTUAL_PREFIX}${id}`;
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
      if (id.startsWith(RESOLVED_VIRTUAL_PREFIX)) {
        return sources.get(id.slice(RESOLVED_VIRTUAL_PREFIX.length));
      }
    },
  };
};

/**
 * Produces the complete inline Vite config for one generator build.
 * User configuration is merged first; generator invariants are then applied.
 *
 * @param {object} options
 * @param {Map<string, string>} options.sources
 * @param {Record<string, string>} options.input
 * @param {boolean} options.server
 * @param {string} options.outDir
 * @param {import('../types').ResolvedWebConfiguration} options.config
 * @param {import('vite').UserConfig} options.vite
 * @returns {import('vite').InlineConfig}
 */
export const createViteConfig = ({
  sources,
  input,
  server,
  outDir,
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
    // still transform every module.
    plugins: [createVirtualModulesPlugin(sources), ...(vite.plugins ?? [])],

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

      // Both builds are complete Vite outputs. The server library goes to a
      // private directory; the client writes into the final site.
      outDir,
      write: true,
      emptyOutDir: false,
      copyPublicDir: false,
      watch: null,
      lib: false,

      // The client manifest is how the asset tags are found; a manifest the
      // project asked for doubles as that.
      manifest: server ? false : vite.build?.manifest || MANIFEST_NAME,
      ssr: server,

      // Islands make split CSS wrong: a component's stylesheet would arrive
      // with the chunk that hydrates it, long after the server-rendered markup
      // it styles is on screen. One stylesheet keeps the page styled from the
      // first paint, whenever — or whether — its islands load.
      ...(server ? {} : { cssCodeSplit: false }),

      // Browser output follows the generator's minification setting. The
      // server library is only ever executed, never shipped.
      minify: server ? false : (vite.build?.minify ?? webConfig.minify),

      rolldownOptions: {
        ...vite.build?.rolldownOptions,
        input,
        ...(server ? { external: [] } : {}),
        output: {
          ...vite.build?.rolldownOptions?.output,
          format: 'es',

          // Every emitted file, fonts included, is named after its content, so
          // hosts can cache `assets/` indefinitely. The fonts to preload are
          // found through the manifest (see `buildClient`).
          assetFileNames: 'assets/[name]-[hash][extname]',

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
 * Bundles the component library through Vite's SSR pipeline, into one
 * self-contained module Node can import from anywhere. It is written under
 * `outDir`, the temporary directory the `html` generator owns for the library
 * and the compiled page programs, and which it removes once every page is
 * written.
 *
 * @param {import('../types').ServerBundleOptions & { vite?: import('vite').UserConfig }} options
 * @returns {Promise<string>} The `file:` URL of the built library
 */
export const buildServer = async ({
  entry,
  virtualImports,
  outDir,
  config,
  vite = {},
}) => {
  const sources = new Map([
    [SERVER_ENTRY_ID, entry],
    ...Object.entries(virtualImports),
  ]);

  await viteBuild(
    createViteConfig({
      sources,
      input: { [LIBRARY_NAME]: SERVER_ENTRY_ID },
      server: true,
      outDir,
      config,
      vite,
    })
  );

  return pathToFileURL(join(outDir, `${LIBRARY_NAME}.mjs`)).href;
};

/**
 * Compiles one page program's JSX to the calls it imports from the library.
 * A single native transform, no module graph: this runs once per page.
 *
 * @param {string} code
 * @param {string} fileName
 * @returns {Promise<string>}
 */
export const compile = async (code, fileName) => {
  const result = await transformWithOxc(code, fileName, {
    jsx: {
      runtime: 'classic',
      pragma: JSX_PRAGMA,
      pragmaFrag: JSX_PRAGMA_FRAG,
    },
  });

  return result.code;
};

/**
 * Collects the chunks an entry statically imports, transitively, in the order
 * Vite would preload them.
 *
 * @param {Record<string, { file: string, imports?: Array<string> }>} manifest
 * @param {{ imports?: Array<string> }} chunk
 * @param {Set<string>} [seen]
 * @returns {Array<string>}
 */
const collectImports = (manifest, chunk, seen = new Set()) => {
  for (const key of chunk.imports ?? []) {
    if (!seen.has(key)) {
      seen.add(key);
      collectImports(manifest, manifest[key], seen);
    }
  }

  return [...seen].map(key => manifest[key].file);
};

/**
 * Whether a manifest entry is one of the fonts to preload. Fonts get a manifest
 * entry of their own, under the source file they were emitted from.
 *
 * @param {{ src: string }} entry
 * @returns {boolean}
 */
const isPreloadedFont = ({ src }) => FONTS.includes(posix.basename(src));

/**
 * Bundles the client entry into the site and reads back, from Vite's
 * manifest, the assets every page has to load.
 *
 * @param {import('../types').ClientBundleOptions & { vite?: import('vite').UserConfig }} options
 * @returns {Promise<import('../types').ClientAssets>}
 */
export const buildClient = async ({
  entry,
  virtualImports,
  config,
  vite = {},
}) => {
  const sources = new Map([
    [
      CLIENT_ENTRY_ID,
      `import ${JSON.stringify(MODULE_PRELOAD_POLYFILL)};\n${entry}`,
    ],
    ...Object.entries(virtualImports),
  ]);

  const outDir = resolve(config.output);

  await viteBuild(
    createViteConfig({
      sources,
      input: { [CLIENT_NAME]: CLIENT_ENTRY_ID },
      server: false,
      outDir,
      config,
      vite,
    })
  );

  // A manifest the project configured is read from where it asked for it and
  // kept; otherwise the one written for the generator's own use is removed
  // again, since it has no business shipping with the site.
  const configuredManifest = vite.build?.manifest;
  const manifestPath = join(
    outDir,
    typeof configuredManifest === 'string' ? configuredManifest : MANIFEST_NAME
  );

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  if (!configuredManifest) {
    await rm(manifestPath);
    await rmdir(dirname(manifestPath)).catch(() => {});
  }

  const entries = Object.values(manifest);
  const chunk = entries.find(item => item.isEntry);

  // Vite lists a chunk's stylesheets under that chunk, except with CSS code
  // splitting off (see `createViteConfig`): the site's CSS is then one file
  // with a manifest entry of its own, so it is found by its extension.
  const stylesheets = entries
    .map(({ file }) => file)
    .filter(file => file.endsWith('.css'));

  const fonts = entries
    .filter(({ src }) => src)
    .filter(isPreloadedFont)
    .map(({ file }) => file);

  return {
    scripts: [chunk.file],
    preloads: collectImports(manifest, chunk),
    stylesheets: [...new Set(stylesheets)],
    fonts,
  };
};

/**
 * Creates the default Vite implementation of the web bundler contract.
 *
 * @param {import('vite').UserConfig} [options]
 * @returns {import('../types').WebBundler}
 */
export const createViteBundler = (options = {}) => ({
  /**
   * Bundles the server-side component library.
   *
   * @param {import('../types').ServerBundleOptions} context
   */
  buildServer: context => buildServer({ ...context, vite: options }),
  compile,
  /**
   * Bundles the client assets.
   *
   * @param {import('../types').ClientBundleOptions} context
   */
  buildClient: context => buildClient({ ...context, vite: options }),
});
