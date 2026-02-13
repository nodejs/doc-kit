import { join } from 'node:path';

import virtual from '@rollup/plugin-virtual';
import { build } from 'rolldown';

import cssLoader from './css.mjs';
import staticData from './data.mjs';

// Resolve node_modules relative to this package (doc-kit), not cwd.
// This ensures modules are found when running from external directories.
const DOC_KIT_NODE_MODULES = join(
  import.meta.dirname,
  '../../../../node_modules'
);

/**
 * Asynchronously bundles JavaScript source code (and its CSS imports),
 * targeting either browser (client) or server (Node.js) environments.
 *
 * @param {Map<string, string>} codeMap - Map of {fileName: code} for all builds.
 * @param {Object} [options] - Build configuration object.
 * @param {boolean} [options.server=false] - Whether this is a server-side build.
 */
export default async function bundleCode(codeMap, { server = false } = {}) {
  const result = await build({
    // Entry points: array of virtual module names that the virtual plugin provides
    input: Array.from(codeMap.keys()),

    // Experimental features: import maps for client, none for server
    experimental: {
      chunkImportMap: !server,
    },

    checks: {
      // Disable plugin timing logs for cleaner output. This can be re-enabled for debugging performance issues.
      pluginTimings: false,
    },

    // Output configuration
    output: {
      // Output module format:
      // - "cjs" for CommonJS (used in Node.js environments)
      // - "esm" for browser environments (Using Chunk Code-Splitting)
      format: server ? 'cjs' : 'esm',

      // Minify output only for browser builds to optimize file size.
      // Server builds are usually not minified to preserve stack traces and debuggability.
      minify: !server,
    },

    // Platform informs Rolldown of the environment-specific code behavior:
    // - 'node' enables things like `require`, and skips polyfills.
    // - 'browser' enables inlining of polyfills and uses native browser features.
    platform: server ? 'node' : 'browser',

    // External dependencies to exclude from bundling.
    // These are expected to be available at runtime in the server environment.
    // This reduces bundle size and avoids bundling shared server libs.
    external: server
      ? ['preact', 'preact-render-to-string', '@node-core/ui-components']
      : [],

    transform: {
      // Inject global compile-time constants that will be replaced in code.
      // These are useful for tree-shaking and conditional branching.
      // Be sure to update type declarations (`types.d.ts`) if these change.
      define: {
        // Static data injected directly into the bundle (as a literal or serialized JSON).
        __STATIC_DATA__: staticData,

        // Boolean flags used for conditional logic in source code:
        // Example: `if (SERVER) {...}` or `if (CLIENT) {...}`
        // These flags help split logic for server/client environments.
        // Unused branches will be removed via tree-shaking.
        SERVER: String(server),
        CLIENT: String(!server),
      },

      // JSX transformation configuration.
      // `'react-jsx'` enables the automatic JSX runtime, which doesn't require `import React`.
      // Since we're using Preact via aliasing, this setting works well with `preact/compat`.
      jsx: 'react-jsx',
    },

    // Module resolution configuration.
    resolve: {
      // exports condition to use
      conditionNames: ['rolldown'],

      // Alias react imports to preact/compat for smaller bundle sizes.
      // Explicit jsx-runtime aliases are required for the automatic JSX transform.
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
      },

      // Tell the bundler where to find node_modules.
      // This ensures packages are found when running doc-kit from external directories
      // (e.g., running from the node repository via tools/doc/node_modules/.bin/doc-kit).
      modules: [DOC_KIT_NODE_MODULES, 'node_modules'],
    },

    // Array of plugins to apply during the build.
    plugins: [
      // Virtual plugin: provides in-memory modules from codeMap
      virtual(Object.fromEntries(codeMap)),

      // Load CSS imports via the custom plugin.
      // This plugin will collect imported CSS files and return them as `source` chunks.
      cssLoader(),
    ],

    // Enable tree-shaking to remove unused code
    treeshake: true,

    // Return chunks in memory instead of writing to disk
    write: false,
  });

  // Separate CSS assets from JavaScript chunks
  const assets = result.output.filter(c => c.type === 'asset');
  const chunks = result.output.filter(c => c.type === 'chunk');

  const importMap = assets.find(c => c.fileName === 'importmap.json');

  return {
    css: assets
      .filter(c => c.fileName.endsWith('.css'))
      .map(f => f.source)
      .join(''),
    chunks: chunks.map(({ fileName, code, isEntry }) => ({
      fileName: fileName.replace('_virtual_', ''),
      isEntry,
      code,
    })),
    importMap: importMap?.source.toString(),
  };
}
