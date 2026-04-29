'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';
import buildContent from '../jsx-ast/utils/buildContent.mjs';
import { processJSXEntries } from '../web/utils/processing.mjs';

/**
 * Generates a single `all.html` file containing every API documentation
 * module rendered through the `web` generator pipeline.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('web-all');

  const template = await readFile(config.templatePath, 'utf-8');

  // Match `legacy-html-all`: skip the synthetic `index` entries.
  const entries = input.filter(entry => entry.api !== 'index');

  // Build a single combined JSXContent that wraps every entry's content in
  // one Layout component, mirroring how `jsx-ast` produces per-module pages.
  const combined = await buildContent(entries, {
    api: 'all',
    path: '/all',
    basename: 'all.html',
    heading: {
      type: 'heading',
      depth: 1,
      children: [{ type: 'text', value: 'All' }],
      data: { name: 'All', text: 'All', slug: 'all' },
    },
  });

  // Pass the original metadata entries as the sidebar source so `all.html`
  // exposes the same navigation as the per-module pages produced by `web`.
  const sidebarEntries = entries.map(entry => ({ data: entry }));

  const { results, css, chunks } = await processJSXEntries(
    [combined],
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

  return { html: results[0].html.toString(), css };
}
