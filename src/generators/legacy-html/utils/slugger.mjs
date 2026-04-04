'use strict';

// Matches headings in the deprecations API doc (e.g., "DEP0001: some title")
// and captures the deprecation code (e.g., "DEP0001") as the first group
const DEPRECATION_HEADING_REGEX = /^(DEP\d+):/;

/**
 * Creates a stateful slugger for legacy anchor links.
 *
 * Generates underscore-separated slugs in the form `{apiStem}_{text}`,
 * appending `_{n}` for duplicates to preserve historical anchor compatibility.
 *
 * For the deprecations API doc, headings matching the `DEP####:` pattern use
 * just the deprecation code (e.g., `DEP0001`) as the anchor, matching the
 * behavior of the old tooling and preserving existing external links.
 *
 * @returns {(text: string, apiStem: string) => string}
 */
export const createLegacySlugger =
  (counters = {}) =>
  (text, apiStem) => {
    const depMatch =
      apiStem === 'deprecations' && DEPRECATION_HEADING_REGEX.exec(text);

    if (depMatch) {
      return depMatch[1];
    }

    const id = `${apiStem}_${text}`
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^\d/, '_$&');

    counters[id] ??= -1;
    const count = ++counters[id];
    return count > 0 ? `${id}_${count}` : id;
  };
