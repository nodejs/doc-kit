'use strict';

/**
 * creates a stateful slugger for legacy anchor links
 *
 * generates underscore-separated slugs in the form `{apiStem}_{text}`,
 * appending `_{n}` for duplicates to preserve historical anchor compatibility
 *
 * @returns {(text: string, apiStem: string) => string}
 */
export const createLegacySlugger =
  (counters = {}) =>
  (text, apiStem) => {
    const base = (text || 'section').trim();
    const id = `${apiStem}_${base}`
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^\d/, '_$&');
    counters[id] ??= -1;
    const count = ++counters[id];
    return count > 0 ? `${id}_${count}` : id;
  };
