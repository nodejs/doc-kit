import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import dedent from 'dedent';

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
    const lastmod = new Date().toISOString().split('T')[0];

    const apiPages = entries
      .filter(entry => entry.heading.depth === 1)
      .map(entry => createPageSitemapEntry(entry, lastmod));

    /**
     * @typedef {import('./types').SitemapEntry}
     */
    const mainPage = {
      loc: new URL('/docs/latest/api/', BASE_URL).href,
      lastmod,
      changefreq: 'daily',
      priority: '1.0',
    };

    apiPages.push(mainPage);

    const template = await readFile(
      join(import.meta.dirname, 'template.xml'),
      'utf-8'
    );

    const urlset = apiPages
      .map(
        page => dedent`
        <url>
          <loc>${page.loc}</loc>
          <lastmod>${page.lastmod}</lastmod>
          <changefreq>${page.changefreq}</changefreq>
          <priority>${page.priority}</priority>
        </url>
      `
      )
      .join('\n');

    const sitemap = template.replace('__URLSET__', urlset);

    if (output) {
      await writeFile(join(output, 'sitemap.xml'), sitemap, 'utf-8');
    }

    return sitemap;
  },
};
