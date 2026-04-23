import { populate } from '#core/utils/configuration/templates.mjs';

/**
 * Builds an API doc sitemap url.
 *
 * @param {import('@doc-kittens/internal/src/generators/metadata/types').MetadataEntry} entry
 * @param {import('#core/utils/configuration/types').Configuration['sitemap']} config
 * @returns {import('../../generators/sitemap/types').SitemapEntry}
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
