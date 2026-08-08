'use strict';

import { readFile } from 'node:fs/promises';

import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';

import { copyStaticAssets } from './utils/copying.mjs';
import { processBundles } from './utils/processing.mjs';

/**
 * Main generation function that sends per-page JSX code to the web bundler.
 *
 * Receives `jsx-ast`'s output as `{ data, code }` or `{ data, codeRef }`
 * items — the JSX AST was already serialized to `code` in the jsx-ast worker,
 * and for cached pages even the code string stays on disk behind the lazy
 * `codeRef` until (and unless) server rendering actually needs it. Bundling
 * runs once over the accumulated entries, since shared component chunks, CSS,
 * and the sidebar need every entry together.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('html');

  const template = await readFile(config.templatePath, 'utf-8');

  // Per-page metadata, in render order. Each item is small — the heavy JSX
  // AST was converted to `code` and discarded in the jsx-ast worker.
  const datas = input.map(item => item.data);

  // Sidebar lists only the real module pages.
  const sidebarEntries = datas
    .filter(data => data.synthetic !== true)
    .map(data => ({ data }));

  await processBundles({
    items: input,
    datas,
    sidebarEntries,
    template,
  });

  await copyStaticAssets(config);
}
