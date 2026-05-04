'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { processJSXEntries } from './utils/processing.mjs';
import { buildNotFoundPage } from './utils/synthetic/404.mjs';
import { buildAllPage } from './utils/synthetic/all.mjs';
import { buildIndexPage } from './utils/synthetic/index.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';
import buildContent from '../jsx-ast/utils/buildContent.mjs';

/**
 * Main generation function that processes JSX AST entries into web bundles.
 *
 * Generates the regular per-module pages plus, when enabled by configuration,
 * the synthetic `all`, `index`, and `404` pages. Everything is bundled in a
 * single pass so shared component chunks and CSS are produced once.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('web');

  const template = await readFile(config.templatePath, 'utf-8');

  // The synthetic `index` entry from Core is replaced by our own
  // `index.html` (with stability overview) when `generateIndexPage` is on.
  //
  // TODO(@avivkeller): Once this lands in core, remove the `index.html`
  // page from Core, then remove this check.
  const moduleEntries = input.filter(entry => entry.data.api !== 'index');

  // Reconstruct the flat metadata list from the per-module section entries
  // attached by `jsx-ast`. Used to build the synthetic `all` and `index`
  // pages without a separate `metadata` dependency.
  const synthDescriptors = [];

  if (config.generateAllPage || config.generateIndexPage) {
    const metadata = moduleEntries.flatMap(entry => entry.sectionEntries);

    if (config.generateAllPage) {
      synthDescriptors.push(buildAllPage(metadata));
    }
    if (config.generateIndexPage) {
      synthDescriptors.push(buildIndexPage(metadata));
    }
  }

  if (config.generateNotFoundPage) {
    synthDescriptors.push(buildNotFoundPage());
  }

  const syntheticEntries = await Promise.all(
    synthDescriptors.map(({ head, entries }) => buildContent(entries, head))
  );

  // Sidebar lists only the real module pages.
  const sidebarEntries = moduleEntries.map(entry => ({ data: entry.data }));

  const allEntries = [...moduleEntries, ...syntheticEntries];

  const { results, css, chunks } = await processJSXEntries(
    allEntries,
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
