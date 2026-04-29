'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { buildNotFoundPage } from './utils/404.mjs';
import { buildAllPage } from './utils/all.mjs';
import { buildIndexPage } from './utils/index.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';
import buildContent from '../jsx-ast/utils/buildContent.mjs';
import { processJSXEntries } from '../web/utils/processing.mjs';

/**
 * Generates the `web-all` output: `all.html`, `index.html`, and `404.html`.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('web-all');
  const template = await readFile(config.templatePath, 'utf-8');

  // Drop the synthetic `index` entry — we re-generate `index.html` ourselves.
  const entries = input.filter(entry => entry.api !== 'index');

  const pages = [
    buildAllPage(entries),
    buildIndexPage(entries),
    buildNotFoundPage(),
  ];

  const jsxContents = await Promise.all(
    pages.map(({ head, entries: pageEntries }) =>
      buildContent(pageEntries, head)
    )
  );

  // Sidebar still needs to link to every module page produced by `web`.
  const sidebarEntries = entries.map(entry => ({ data: entry }));

  const { results, css, chunks } = await processJSXEntries(
    jsxContents,
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

  return {
    html: results.map(({ html }) => html.toString()),
    css,
  };
}
