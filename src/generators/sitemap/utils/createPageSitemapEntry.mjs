import { buildApiDocURL } from '../../../utils/url.mjs';

/**
 * Builds an API doc sitemap url.
 *
 * @param {ApiDocMetadataEntry} entry
 * @param {string} lastmod
 * @returns {import('../types').SitemapEntry}
 */
export const createPageSitemapEntry = (entry, lastmod) => {
  const { href } = buildApiDocURL(entry, true);

  return { loc: href, lastmod, changefreq: 'weekly', priority: '0.8' };
};
