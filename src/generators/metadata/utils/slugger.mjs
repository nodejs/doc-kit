'use strict';

import GitHubSlugger, { slug as defaultSlugFn } from 'github-slugger';

import { DOC_API_SLUGS_REPLACEMENTS } from '../constants.mjs';

/**
 * Creates a modified version of the GitHub Slugger
 *
 * @returns {InstanceType<typeof import('github-slugger').default>} The modified GitHub Slugger
 */
const createNodeSlugger = () => {
  const slugger = new GitHubSlugger();
  const slugFn = slugger.slug.bind(slugger);

  // Legacy slug counter tracking (mirrors old Node.js deduplication)
  const legacyIdCounters = { __proto__: null };

  /** Deduplicates legacy slugs by appending an incremented counter */
  const legacyDeduplicateFn = id => {
    if (legacyIdCounters[id] !== undefined) {
      return `${id}_${++legacyIdCounters[id]}`;
    }
    legacyIdCounters[id] = 0;
    return id;
  };

  return {
    ...slugger,
    /** Creates a new slug with Node.js-specific replacements applied */
    slug: title => slug(title, slugFn),
    /** Creates a legacy-style slug to preserve old anchor links */
    legacySlug: (title, api) => getLegacySlug(title, api, legacyDeduplicateFn),
  };
};

/**
 * @param {string} title
 * @param {typeof defaultSlugFn} slugFn
 */
export const slug = (title, slugFn = defaultSlugFn) =>
  DOC_API_SLUGS_REPLACEMENTS.reduce(
    (piece, { from, to }) => piece.replace(from, to),
    slugFn(title)
  );

// Legacy slug algorithm regex patterns (from old Node.js doc generator)
const notAlphaNumerics = /[^a-z0-9]+/g;
const edgeUnderscores = /^_+|_+$/g;
const notAlphaStart = /^[^a-z]/;

/**
 * Generates a legacy-style slug to preserve old anchor links.
 * The old Node.js doc generator used this format: filename_headingtext
 * with non-alphanumerics replaced by underscores.
 *
 * @param {string} title The heading text
 * @param {string} api The API file identifier (e.g. 'fs', 'http')
 * @param {(id: string) => string} [deduplicateFn] Optional function for counter-based deduplication
 * @returns {string} The legacy slug
 */
export const getLegacySlug = (title, api, deduplicateFn) => {
  let id = `${api}_${title}`
    .toLowerCase()
    .replace(notAlphaNumerics, '_')
    .replace(edgeUnderscores, '')
    .replace(notAlphaStart, '_$&');

  return deduplicateFn ? deduplicateFn(id) : id;
};

export default createNodeSlugger;
