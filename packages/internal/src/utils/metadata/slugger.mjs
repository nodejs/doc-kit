'use strict';

import GitHubSlugger, { slug as defaultSlugFn } from 'github-slugger';

import { DOC_API_SLUGS_REPLACEMENTS } from './constants.mjs';

/**
 * Creates a modified version of the GitHub Slugger
 *
 * @returns {InstanceType<typeof import('github-slugger').default>} The modified GitHub Slugger
 */
const createNodeSlugger = () => {
  const slugger = new GitHubSlugger();
  const slugFn = slugger.slug.bind(slugger);

  return {
    ...slugger,
    /**
     * Creates a new slug based on the provided string
     *
     * @param {string} title The title to be parsed into a slug
     */
    // Applies certain string replacements that are specific
    // to the way how Node.js generates slugs/anchor IDs
    slug: title => slug(title, slugFn),
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

export default createNodeSlugger;
