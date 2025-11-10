import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import createASTBuilder from './utils/generate.mjs';
import { processJSXEntries } from './utils/processing.mjs';
import { safeWrite } from '../../utils/safeWrite.mjs';

/**
 * Web generator - transforms JSX AST entries into complete web bundles.
 *
 * This generator processes JSX AST entries and produces:
 * - Server-side rendered HTML pages
 * - Client-side JavaScript with code splitting
 * - Bundled CSS styles
 *
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'web',
  version: '1.0.0',
  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',
  dependsOn: 'jsx-ast',

  /**
   * Main generation function that processes JSX AST entries into web bundles.
   *
   * @param {import('../jsx-ast/utils/buildContent.mjs').JSXContent[]} entries - JSX AST entries to process.
   * @param {Partial<GeneratorOptions>} options - Generator options.
   * @param {string} [options.output] - Output directory for generated files.
   * @param {string} options.version - Documentation version string.
   * @returns {Promise<Array<{html: Buffer, css: string}>>} Generated HTML and CSS.
   */
  async generate(entries, { output, version }) {
    // Load the HTML template with placeholders
    const template = await readFile(
      new URL('template.html', import.meta.url),
      'utf-8'
    );

    // Create AST builders for server and client programs
    const astBuilders = createASTBuilder();

    // Create require function for resolving external packages in server code
    const requireFn = createRequire(import.meta.url);

    // Process all entries: convert JSX to HTML/CSS/JS
    const { results, css, jsChunks } = await processJSXEntries(
      entries,
      template,
      astBuilders,
      requireFn,
      { version }
    );

    // Write files to disk if output directory is specified
    if (output) {
      // Write HTML files
      for (const { html, api } of results) {
        await safeWrite(join(output, `${api}.html`), html, 'utf-8');
      }

      // Write code-split JavaScript chunks
      for (const chunk of jsChunks) {
        await safeWrite(join(output, chunk.fileName), chunk.code, 'utf-8');
      }

      // Write CSS bundle
      await safeWrite(join(output, 'styles.css'), css, 'utf-8');
    }

    // Return HTML and CSS for each entry
    return results.map(({ html }) => ({ html, css }));
  },
};
