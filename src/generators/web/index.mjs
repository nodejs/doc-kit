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
 * NOTE: This generator does NOT implement processChunk because:
 * 1. Server-side bundling requires all entries together for code splitting
 * 2. Client-side bundling requires all entries together for shared chunks
 * 3. The parallelization benefit is in the upstream jsx-ast generator
 *
 * @typedef {import('../jsx-ast/utils/buildContent.mjs').JSXContent[]} Input
 * @type {GeneratorMetadata<Input, Array<{html: Buffer, css: string}>>}
 */
export default {
  name: 'web',
  version: '1.0.0',
  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',
  dependsOn: 'jsx-ast',

  /**
   * Main generation function that processes JSX AST entries into web bundles.
   * @param {Input} entries
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(entries, { output, version }) {
    // Load template from file
    const template = await readFile(
      new URL('template.html', import.meta.url),
      'utf-8'
    );

    // Create AST builders for server and client programs
    const astBuilders = createASTBuilder();

    // Create require function - must be created here, not at module level,
    // to ensure correct resolution context in worker threads
    const requireFn = createRequire(import.meta.url);

    // Process all entries together (required for code splitting optimization)
    const { results, css, chunks } = await processJSXEntries(
      entries,
      template,
      astBuilders,
      requireFn,
      { version }
    );

    // Write files to disk if output directory is specified
    if (output) {
      await Promise.all([
        ...results.map(({ html, api }) =>
          writeFile(join(output, `${api}.html`), html, 'utf-8')
        ),
        ...chunks.map(chunk =>
          writeFile(join(output, chunk.fileName), chunk.code, 'utf-8')
        ),
        writeFile(join(output, 'styles.css'), css, 'utf-8'),
      ]);
    }

    return results.map(({ html }) => ({ html, css }));
  },
};
