import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import createASTBuilder from './utils/generate.mjs';
import { processJSXEntries } from './utils/processing.mjs';

/**
 * Web generator - transforms JSX AST entries into complete web bundles.
 *
 * This generator processes JSX AST entries and produces:
 * - Server-side rendered HTML pages
 * - Client-side JavaScript with code splitting
 * - Bundled CSS styles
 *
 * Note: This generator does NOT support streaming/chunked processing because
 * processJSXEntries needs all entries together to generate code-split bundles.
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
   * @returns {Promise<import('../jsx-ast/utils/buildContent.mjs').JSXContent[]>}
   */
  async generate(entries, { output, version }) {
    const template = await readFile(
      new URL('template.html', import.meta.url),
      'utf-8'
    );

    // Create AST builders for server and client programs
    const astBuilders = createASTBuilder();

    // Create require function for resolving external packages in server code
    const requireFn = createRequire(import.meta.url);

    // Process all entries: convert JSX to HTML/CSS/JS
    const { results, css, chunks } = await processJSXEntries(
      entries,
      template,
      astBuilders,
      requireFn,
      { version }
    );

    // Process all entries together (required for code-split bundles)
    if (output) {
      // Write HTML files
      for (const { html, api } of results) {
        await writeFile(join(output, `${api}.html`), html, 'utf-8');
      }

      // Write code-split JavaScript chunks
      for (const chunk of chunks) {
        await writeFile(join(output, chunk.fileName), chunk.code, 'utf-8');
      }

      // Write CSS bundle
      await writeFile(join(output, 'styles.css'), css, 'utf-8');
    }

    return results;
  },
};
