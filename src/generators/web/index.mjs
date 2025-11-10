import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import createASTBuilder from './utils/generate.mjs';
import { processJSXEntries } from './utils/processing.mjs';
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

    // Process all entries at once
    const { results, css, jsChunks } = await processJSXEntries(
      entries,
      template,
      astBuilders,
      requireFn,
      { version }
    );

    // Write all files if output directory is specified
    if (output) {
      // Write all HTML files
      for (const { html, api } of results) {
        safeWrite(join(output, `${api}.html`), html, 'utf-8');
      }

      // Write all JS chunks
      for (const chunk of jsChunks) {
        safeWrite(join(output, chunk.fileName), chunk.code, 'utf-8');
      }

      // Write the CSS file
      safeWrite(join(output, 'styles.css'), css, 'utf-8');
    }

    return results.map(({ html }) => ({ html, css }));
  },
};
