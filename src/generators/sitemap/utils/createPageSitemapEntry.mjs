import { populate } from '../../../utils/configuration/templates.mjs';

/**
 * Builds an API doc sitemap url.
 *
 * @param {import('../../metadata/types').MetadataEntry} entry
 * @param {import('../../../utils/configuration/types').Configuration['sitemap']} config
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
