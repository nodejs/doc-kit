import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import createASTBuilder from './utils/generate.mjs';
import { processJSXEntries } from './utils/processing.mjs';
import getConfig from '../../utils/configuration/index.mjs';

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
 * @type {import('./types').Generator}
 */
export default {
  name: 'web',

  version: '1.0.0',

  description: 'Generates HTML/CSS/JS bundles from JSX AST entries',

  dependsOn: 'jsx-ast',

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.html'),
    title: 'Node.js',
    imports: {
      '#config/Logo': '@node-core/ui-components/Common/NodejsLogo',
    },
  },

  /**
   * Main generation function that processes JSX AST entries into web bundles.
   */
  async generate(input) {
    const config = getConfig('web');

    const template = await readFile(config.templatePath, 'utf-8');

    // Create AST builders for server and client programs
    const astBuilders = createASTBuilder();

    // Create require function for resolving external packages in server code
    const requireFn = createRequire(import.meta.url);

    // Process all entries: convert JSX to HTML/CSS/JS
    const { results, css, chunks } = await processJSXEntries(
      input,
      template,
      astBuilders,
      requireFn,
      config
    );

    // Process all entries together (required for code-split bundles)
    if (config.output) {
      // Write HTML files
      for (const { html, api } of results) {
        await writeFile(join(config.output, `${api}.html`), html, 'utf-8');
      }

      // Write code-split JavaScript chunks
      for (const chunk of chunks) {
        await writeFile(
          join(config.output, chunk.fileName),
          chunk.code,
          'utf-8'
        );
      }

      // Write CSS bundle
      await writeFile(join(config.output, 'styles.css'), css, 'utf-8');
    }

    return results.map(({ html }) => ({ html: html.toString(), css }));
  },
};
