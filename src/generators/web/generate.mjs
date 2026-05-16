'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { processJSXEntries } from './utils/processing.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';

/**
 * Main generation function that processes JSX AST entries into web bundles.
 *
 * Bundles all JSX AST entries in a single pass so shared component chunks and
 * CSS are produced once.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('web');

  const template = await readFile(config.templatePath, 'utf-8');

  // Sidebar lists only the real module pages.
  const sidebarEntries = input.filter(entry => entry.data.synthetic !== true);

  const { results, css, chunks } = await processJSXEntries(
    input,
    template,
    sidebarEntries
  );

  if (config.output) {
    for (const { html, path } of results) {
      await writeFile(join(config.output, `${path}.html`), html, 'utf-8');
    }

    for (const chunk of chunks) {
      await writeFile(join(config.output, chunk.fileName), chunk.code, 'utf-8');
    }

    await writeFile(join(config.output, 'styles.css'), css, 'utf-8');
  }

  return results.map(({ html }) => ({ html: html.toString(), css }));
}
