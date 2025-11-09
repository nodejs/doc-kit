import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import webTwoslashGenerator from '../web-twoslash/index.mjs';
import createASTBuilder from './utils/generate.mjs';
import { processJSXEntry } from './utils/processing.mjs';

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

    await webTwoslashGenerator.generate(null, { output });

    const results = [];

    let mainCss = '';

    for (const entry of entries) {
      const { html, css } = await processJSXEntry(
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
        await writeFile(join(output, `${entry.data.api}.html`), html, 'utf-8');
      }
    }

    // Write CSS file
    if (output && mainCss) {
      await writeFile(join(output, 'styles.css'), mainCss, 'utf-8');
    }

    return results;
  },
};
