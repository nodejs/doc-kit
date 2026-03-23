'use strict';

const notAlphaNumerics = /[^a-z0-9]+/g;
const edgeUnderscores = /^_+|_+$/g;
const notAlphaStart = /^[^a-z]/;

/**
 * Deduplicates legacy slugs by appending an incremented counter.
 * Adapted from maintainer suggestion to preserve `id` on first occurrence.
 *
 * @param {Record<string, number>} counters
 * @returns {(id: string) => string}
 */
export const legacyDeduplicator =
  (counters = { __proto__: null }) =>
  id => {
    counters[id] ??= -1;
    const count = ++counters[id];
    return count > 0 ? `${id}_${count}` : id;
  };

/**
 * Creates a stateful slugger for legacy anchor links.
 *
 * @returns {{ getLegacySlug: (text: string, apiStem: string) => string }}
 */
export const createLegacySlugger = () => {
  const deduplicate = legacyDeduplicator();

  return {
    /**
     * Generates a legacy-style slug to preserve old anchor links.
     *
     * @param {string} text The heading text
     * @param {string} apiStem The API file identifier (e.g. 'fs', 'http')
     * @returns {string} The legacy slug
     */
    getLegacySlug: (text, apiStem) => {
      const id = `${apiStem}_${text}`
        .toLowerCase()
        .replace(notAlphaNumerics, '_')
        .replace(edgeUnderscores, '')
        .replace(notAlphaStart, '_$&');

      return deduplicate(id);
    },
  };
};
