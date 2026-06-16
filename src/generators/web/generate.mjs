'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { copyStaticAssets } from './utils/copying.mjs';
import { createCodeConverter, processBundles } from './utils/processing.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';

/**
 * Main generation function that bundles per-page JSX code into web output.
 *
 * Receives `jsx-ast`'s output as `{ data, code }` items — the JSX AST was
 * already serialized to `code` in the jsx-ast worker, so no AST is held here.
 * Bundling and rendering then run once over the accumulated code, since shared
 * component chunks, CSS, and the sidebar need every entry together.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('web');

  const template = await readFile(config.templatePath, 'utf-8');

  const converter = createCodeConverter();

  // Per-page metadata, in render order. Each item is already just
  // `{ data, code }` — the heavy JSX AST was converted to `code` and discarded
  // in the jsx-ast worker, so nothing large is held here.
  const datas = [];

  for (const item of input) {
    converter.add(item);
    datas.push(item.data);
  }

  // Sidebar lists only the real module pages.
  const sidebarEntries = datas
    .filter(data => data.synthetic !== true)
    .map(data => ({ data }));

  const { results, css, chunks } = await processBundles({
    serverCodeMap: converter.serverCodeMap,
    clientCodeMap: converter.clientCodeMap,
    datas,
    sidebarEntries,
    template,
  });

  if (config.output) {
    for (const { html, path } of results) {
      await writeFile(join(config.output, `${path}.html`), html, 'utf-8');
    }

    for (const chunk of chunks) {
      await writeFile(join(config.output, chunk.fileName), chunk.code, 'utf-8');
    }

    await writeFile(join(config.output, 'styles.css'), css, 'utf-8');

    await copyStaticAssets(config);
  }

  return results.map(({ html }) => ({ html: html.toString(), css }));
}
