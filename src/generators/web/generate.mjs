'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { processJSXEntries } from './utils/processing.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';

/**
 * Main generation function that processes JSX AST entries into web bundles.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('web');

  const template = await readFile(config.templatePath, 'utf-8');

  // The `web-all` generator re-generates `index.html` with a stability
  // overview, so skip the synthetic `index` entry here.
  //
  // TODO(@avivkeller): Once this lands in core, remove the `index.html`
  // page from Core, then remove this check.
  const entries = input.filter(entry => entry.data.api !== 'index');

  // Process all entries: convert JSX to HTML/CSS/JS
  const { results, css, chunks } = await processJSXEntries(entries, template);

  // Process all entries together (required for code-split bundles)
  if (config.output) {
    // Write HTML files
    for (const { html, path } of results) {
      await writeFile(join(config.output, `${path}.html`), html, 'utf-8');
    }

    // Write code-split JavaScript chunks
    for (const chunk of chunks) {
      await writeFile(join(config.output, chunk.fileName), chunk.code, 'utf-8');
    }

    // Write CSS bundle
    await writeFile(join(config.output, 'styles.css'), css, 'utf-8');
  }

  return results.map(({ html }) => ({ html: html.toString(), css }));
}
