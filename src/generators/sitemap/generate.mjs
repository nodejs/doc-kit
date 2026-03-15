'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createPageSitemapEntry } from './utils/createPageSitemapEntry.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { populate } from '../../utils/configuration/templates.mjs';
import { writeFile } from '../../utils/file.mjs';

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

  const lastmod = new Date().toISOString().split('T')[0];

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
      entryTemplate
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
