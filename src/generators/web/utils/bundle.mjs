import virtual from '@rollup/plugin-virtual';
import { build } from 'rolldown';

import cssLoader from './css.mjs';
import staticData from './data.mjs';

/**
 * Asynchronously bundles JavaScript source code (and its CSS imports),
 * targeting either browser (client) or server (Node.js) environments.
 *
 * @param {string} code - JavaScript/JSX source code to bundle.
 * @param {{ server: boolean }} options - Build configuration object.
 */
export default async function bundleCode(code, { server = false } = {}) {
  const result = await build({
    // Define the entry point module name — this is virtual (not a real file).
    // The virtual plugin will provide the actual code string under this name.
    input: 'entrypoint.jsx',

    // Configuration for the output bundle
    output: {
      // Output module format:
      // - "cjs" for CommonJS (used in Node.js environments)
      // - "iife" for browser environments (self-contained script tag)
      format: server ? 'cjs' : 'iife',

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
    },

    // JSX transformation configuration.
    // `'react-jsx'` enables the automatic JSX runtime, which doesn't require `import React`.
    // Since we're using Preact via aliasing, this setting works well with `preact/compat`.
    jsx: 'react-jsx',

    // Module resolution aliases.
    // This tells the bundler to use `preact/compat` wherever `react` or `react-dom` is imported.
    // Allows you to write React-style code but ship much smaller Preact bundles.
    resolve: {
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
      },
    },

    // Array of plugins to apply during the build.
    plugins: [
      // The virtual plugin lets us define a virtual file called 'entrypoint.jsx'
      // with the contents provided by the `code` argument.
      // This becomes the root module for the bundler.
      virtual({
        'entrypoint.jsx': code,
      }),

      // Load CSS imports via the custom plugin.
      // This plugin will collect imported CSS files and return them as `source` chunks.
      cssLoader(),
    ],

    // Enable tree-shaking to eliminate unused imports, functions, and branches.
    // This works best when all dependencies are marked as having no side effects.
    // `sideEffects: false` in the package.json confirms this is safe to do.
    treeshake: true,

    // Disable writing output to disk.
    // Instead, the compiled chunks are returned in memory (ideal for dev tools or sandboxing).
    write: false,
  });

  // Destructure the result to get the output chunks.
  // The first output is always the JavaScript entrypoint.
  // Any additional chunks are styles (CSS).
  const [js, ...cssFiles] = result.output;

  return {
    js: js.code,
    css: cssFiles.map(f => f.source).join(''),
  };
}
