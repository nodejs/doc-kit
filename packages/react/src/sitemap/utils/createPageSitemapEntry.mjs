import { populate } from '@nodejs/doc-kit/utils/configuration/templates.mjs';

/**
 * Builds an API doc sitemap url.
 *
 * @param {import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry} entry
 * @param {import('@nodejs/doc-kit/utils/configuration/types').Configuration['sitemap']} config
 * @param {string} lastmod - Last-modified date as `YYYY-MM-DD`
 * @returns {import('../types').SitemapEntry}
 */
export const createPageSitemapEntry = (entry, config, lastmod) => ({
  loc: populate(config.pageURL, {
    ...config,
    path: entry.path,
  }),
  lastmod,
  changefreq: 'weekly',
  priority: '0.8',
});
