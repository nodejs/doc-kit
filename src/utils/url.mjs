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
    const htmlPath = path.replace(/\.md$/, '.html');
    return new URL(htmlPath, BASE_URL);
  }

  return new URL(path, BASE_URL);
};
