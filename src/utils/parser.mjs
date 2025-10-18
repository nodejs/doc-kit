'use strict';

import { readFile } from 'node:fs/promises';

/**
 * Loads content from a URL or file path
 * @param {string|URL} url The URL or file path to load
 * @returns {Promise<string>} The content as a string
 */
export const loadFromURL = async url => {
  const parsedUrl = url instanceof URL ? url : URL.parse(url);

  if (!parsedUrl || parsedUrl.protocol === 'file:') {
    // Load from file system
    return readFile(parsedUrl, 'utf-8');
  } else {
    // Load from network
    const response = await fetch(parsedUrl);
    return response.text();
  }
};
