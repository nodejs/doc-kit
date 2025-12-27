import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BASE_URL } from '../../constants.mjs';
import { createPageSitemapEntry } from './utils/createPageSitemapEntry.mjs';

/**
 * This generator generates a sitemap.xml file for search engine optimization
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'sitemap',

  version: '1.0.0',

  description: 'Generates a sitemap.xml file for search engine optimization',

  dependsOn: 'metadata',

  /**
   * Generates a sitemap.xml file
   *
   * @param {Input} entries
   * @param {Partial<GeneratorOptions>} options
   * @returns {Promise<string>}
   */
  async generate(entries, { output }) {
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
      .map(entry => createPageSitemapEntry(entry, lastmod));

    const { href: loc } = new URL('/docs/latest/api/', BASE_URL);

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

    if (output) {
      await writeFile(join(output, 'sitemap.xml'), sitemap, 'utf-8');
    }

    return sitemap;
  },
};
