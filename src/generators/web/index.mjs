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
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'web',
  version: '1.0.0',
  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',
  dependsOn: 'jsx-ast',

  /**
   * Process a chunk of JSX AST entries.
   * This simply passes through the entries for aggregation in the main generate function.
   * The actual processing happens in processJSXEntries which needs all entries together.
   *
   * @param {import('../jsx-ast/utils/buildContent.mjs').JSXContent[]} fullInput
   * @param {number[]} itemIndices
   */
  processChunk(fullInput, itemIndices) {
    const results = [];

    for (const idx of itemIndices) {
      results.push(fullInput[idx]);
    }

    return results;
  },

  /**
   * Main generation function that processes JSX AST entries into web bundles.
   *
   * @param {import('../jsx-ast/utils/buildContent.mjs').JSXContent[]} entries - JSX AST entries to process.
   * @param {Partial<GeneratorOptions>} options - Generator options.
   * @param {string} [options.output] - Output directory for generated files.
   * @param {string} options.version - Documentation version string.
   * @returns {AsyncGenerator<Array<import('../jsx-ast/utils/buildContent.mjs').JSXContent>>}
   */
  async *generate(entries, { output, version, worker }) {
    // Start loading template while chunks stream in (parallel I/O)
    const templatePromise = readFile(
      new URL('template.html', import.meta.url),
      'utf-8'
    );

    // Collect all chunks as they stream in from jsx-ast
    const allEntries = [];

    for await (const chunkResult of worker.stream(entries, entries, {})) {
      allEntries.push(...chunkResult);

      yield chunkResult;
    }

    // Now that all chunks are collected, process them together
    // (processJSXEntries needs all entries to generate code-split bundles)
    if (output) {
      const template = await templatePromise;

      // Create AST builders for server and client programs
      const astBuilders = createASTBuilder();

      // Create require function for resolving external packages in server code
      const requireFn = createRequire(import.meta.url);

      // Process all entries: convert JSX to HTML/CSS/JS
      const { results, css, chunks } = await processJSXEntries(
        allEntries,
        template,
        astBuilders,
        requireFn,
        { version }
      );

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
  },
};
