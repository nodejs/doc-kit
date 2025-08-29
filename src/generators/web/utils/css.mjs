import { readFile } from 'node:fs/promises';

import { bundleAsync } from 'lightningcss';

// Since we use rolldown to bundle multiple times,
// we re-use a lot of CSS files, so there is no
// need to re-transpile.
const fileCache = new Map();

/**
 * Rolldown plugin to support `.module.css` files with CSS Modules semantics.
 *
 * This plugin performs the following:
 * 1. Intercepts `.module.css` files during the build
 * 2. Processes them with Lightning CSS (including CSS Module transformation)
 * 3. Collects the resulting CSS to emit as a single `styles.css` file
 * 4. Exports the transformed class names back to the JS file
 *
 * TODO(@avivkeller): Once Rolldown natively supports CSS Modules, this plugin can be removed.
 */
export default () => {
  const cssChunks = new Set();

  return {
    name: 'css-loader', // Required plugin name for debugging

    // Hook into the module loading phase of Rolldown
    load: {
      // Match only files ending with `.module.css`
      filter: {
        id: {
          include: /\.module\.css$/,
        },
      },

      /**
       * Load handler to process matched `.module.css` files
       *
       * @param {string} id - Absolute file path to the CSS file
       */
      async handler(id) {
        // Return from cache if already processed
        if (fileCache.has(id)) {
          const cached = fileCache.get(id);

          // Collect the CSS as normal
          cssChunks.add(cached.code);

          return {
            code: `export default ${JSON.stringify(cached.exports)};`,
            moduleType: 'js',
          };
        }

        // Read the raw CSS file from disk
        const source = await readFile(id, 'utf8');

        // Use Lightning CSS to compile the file with CSS Modules enabled
        const { code, exports } = await bundleAsync({
          filename: id,
          code: Buffer.from(source),
          cssModules: true,
        });

        const css = code.toString();

        // Add the compiled CSS to our in-memory collection
        cssChunks.add(css);

        // Map exported class names to their scoped identifiers
        // e.g., { button: '_button_abc123' }
        const mappedExports = Object.fromEntries(
          Object.entries(exports).map(([key, value]) => [key, value.name])
        );

        // Cache result
        fileCache.set(id, { code: css, exports: mappedExports });

        // Return a JS module that exports the scoped class names
        return {
          code: `export default ${JSON.stringify(mappedExports)};`,
          moduleType: 'js',
        };
      },
    },

    /**
     * buildEnd hook runs once all modules have been processed.
     * We use this opportunity to emit the final bundled CSS file.
     */
    buildEnd() {
      // If no CSS chunks were processed, skip emitting
      if (cssChunks.size === 0) {
        return;
      }

      // Concatenate all collected CSS strings and emit as a build asset
      this.emitFile({
        type: 'asset',
        name: 'styles.css',
        source: Array.from(cssChunks).join(''),
      });
    },
  };
};
