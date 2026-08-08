'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';
import { populate } from '@nodejs/doc-kit/utils/configuration/templates.mjs';
import { writeFile } from '@nodejs/doc-kit/utils/file.mjs';

import { createPageSitemapEntry } from './utils/createPageSitemapEntry.mjs';

/**
 * Generates a sitemap.xml file
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(entries) {
  const { sitemap: config } = getConfig();

  const template = await readFile(
    join(import.meta.dirname, 'template.xml'),
    'utf-8'
  );

  const entryTemplate = await readFile(
    join(import.meta.dirname, 'entry-template.xml'),
    'utf-8'
  );

  // Only emitted when configured: stamping the build date would make every
  // build differ and misstate when the content actually changed.
  const lastmod = config.lastmod;

  const apiPages = entries
    .filter(entry => entry.heading.depth === 1)
    .map(entry => createPageSitemapEntry(entry, config, lastmod));

  const loc = populate(config.indexURL, config);

  /**
   * @typedef {import('./types').SitemapEntry}
   */
  const mainPage = {
    loc,
    lastmod,
    changefreq: 'daily',
    priority: '1.0',
  };

  apiPages.push(mainPage);

  const urlset = apiPages
    .map(page =>
      (page.lastmod
        ? entryTemplate
        : entryTemplate.replace(/\s*<lastmod>__LASTMOD__<\/lastmod>/, '')
      )
        .replace('__LOC__', page.loc)
        .replace('__LASTMOD__', page.lastmod)
        .replace('__CHANGEFREQ__', page.changefreq)
        .replace('__PRIORITY__', page.priority)
    )
    .join('');

  const sitemap = template.replace('__URLSET__', urlset);

  if (config.output) {
    await writeFile(join(config.output, 'sitemap.xml'), sitemap, 'utf-8');
  }

  return sitemap;
}
