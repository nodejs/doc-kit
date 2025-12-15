import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BASE_URL } from '../../constants.mjs';

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
    const apiPages = entries
      .filter(entry => entry.heading.depth === 1)
      .map(entry => {
        const path = entry.api_doc_source.replace(/^doc\//, '/docs/latest/');
        const url = new URL(path, BASE_URL).href;

        return {
          loc: url,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.8',
        };
      });

    const mainPages = [
      {
        loc: new URL('/docs/latest/api/', BASE_URL).href,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '1.0',
      },
    ];

    const allPages = [...mainPages, ...apiPages];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    page => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    if (output) {
      await writeFile(join(output, 'sitemap.xml'), sitemap, 'utf-8');
    }

    return sitemap;
  },
};
