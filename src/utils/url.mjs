import { BASE_URL } from '../constants.mjs';

/**
 * Builds the url of a api doc entry.
 *
 * @param {ApiDocMetadataEntry} entry
 * @param {boolean} [useHtml]
 * @returns {URL}
 */
export const buildApiDocURL = (entry, useHtml = false) => {
  const path = entry.api_doc_source.replace(/^doc\//, '/docs/latest/');

  if (useHtml) {
    return URL.parse(path.replace(/\.md$/, '.html'), BASE_URL);
  }

  return URL.parse(path, BASE_URL);
};
