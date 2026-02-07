import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Converts a value to a parsed URL object.
 *
 * @param {string|URL} url - The URL string or URL object to parse
 * @returns {URL|null} The parsed URL object, or null if parsing fails
 */
export const toParsedURL = url => (url instanceof URL ? url : URL.parse(url));

/**
 * Loads content from a URL or file path
 * @param {string|URL} url The URL or file path to load
 * @returns {Promise<string>} The content as a string
 */
export const loadFromURL = async url => {
  const parsedUrl = toParsedURL(url);

  if (!parsedUrl || parsedUrl.protocol === 'file:') {
    // Load from file system
    return readFile(parsedUrl ?? url, 'utf-8');
  } else {
    // Load from network
    const response = await fetch(parsedUrl);
    return response.text();
  }
};

/**
 * Dynamically imports a module from a URL, using JSON import assertion if applicable.
 *
 * @param {string|URL} url - The URL of the module to import
 * @returns {Promise<any>} The imported module
 */
export const importFromURL = async url => {
  const useJSONAssertion = extname(String(url)) === '.json';

  const parsed = toParsedURL(url);

  const imported = await import(
    parsed ?? pathToFileURL(isAbsolute(url) ? url : join(process.cwd(), url)),
    useJSONAssertion ? { with: { type: 'json' } } : {}
  );

  return imported.default ?? imported;
};
