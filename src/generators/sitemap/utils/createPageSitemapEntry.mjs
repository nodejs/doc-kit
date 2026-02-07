import { buildApiDocURL } from '../../../utils/generators.mjs';

/**
 * Builds an API doc sitemap url.
 *
 * @param {ApiDocMetadataEntry} entry
 * @param {string} baseURL
 * @param {string} lastmod
 * @returns {import('../types').SitemapEntry}
 */
export const createPageSitemapEntry = (entry, baseURL, lastmod) => {
  const { href } = buildApiDocURL(entry, baseURL, true);

  return { loc: href, lastmod, changefreq: 'weekly', priority: '0.8' };
};
