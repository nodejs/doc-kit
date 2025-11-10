import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import createASTBuilder from './utils/generate.mjs';
import { processJSXEntry } from './utils/processing.mjs';
import { safeWrite } from '../../utils/safeWrite.mjs';

/**
 * This generator transforms JSX AST (Abstract Syntax Tree) entries into a complete
 * web bundle, including server-side rendered HTML, client-side JavaScript, and CSS.
 *
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'web',
  version: '1.0.0',
  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',
  dependsOn: 'jsx-ast',

  /**
   * The main generation function for the 'web' generator.
   * It processes an array of JSX AST entries, converting each into a standalone HTML page
   * with embedded client-side JavaScript and linked CSS.
   *
   * @param {import('../jsx-ast/utils/buildContent.mjs').JSXContent[]} entries
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(entries, { output, version }) {
    // Load the HTML template
    const template = await readFile(
      new URL('template.html', import.meta.url),
      'utf-8'
    );

    const astBuilders = createASTBuilder();

    const requireFn = createRequire(import.meta.url);

    const results = [];

    let mainCss = '';

    const writtenChunks = new Set();

    for (const entry of entries) {
      const { html, css, jsChunks } = await processJSXEntry(
        entry,
        template,
        astBuilders,
        requireFn,
        { version }
      );

      results.push({ html, css });

      // Capture the main CSS bundle from the first processed entry
      if (!mainCss && css) {
        mainCss = css;
      }

      // Write HTML file if output directory is specified
      if (output) {
        safeWrite(join(output, `${entry.data.api}.html`), html, 'utf-8');

        // Write JS chunks (only once per unique chunk)
        for (const chunk of jsChunks) {
          if (!writtenChunks.has(chunk.fileName)) {
            safeWrite(join(output, chunk.fileName), chunk.code, 'utf-8');

            writtenChunks.add(chunk.fileName);
          }
        }
      }
    }

    // Write the main CSS file once after processing all entries
    if (output && mainCss) {
      safeWrite(join(output, 'styles.css'), mainCss, 'utf-8');
    }

    return results;
  },
};
