'use strict';

import { loadFromURL } from '../utils/parser.mjs';

/**
 * Retrieves the type map from the provided JSON file.
 *
 * @param {string|URL} path Path to type map JSON file
 * @returns {Promise<Record<string, string>>}
 */
export const parseTypeMap = async path => {
  if (!path || !path.length) {
    return {};
  }

  const typeMapContent = await loadFromURL(path);

  return JSON.parse(typeMapContent);
};
