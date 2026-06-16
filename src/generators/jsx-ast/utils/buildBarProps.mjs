'use strict';

import { visit } from 'unist-util-visit';

import { TOC_MAX_HEADING_DEPTH } from '../constants.mjs';

/**
 * Generate a combined plain text string from all MDAST entries for estimating reading time.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries - API documentation entries
 */
export const extractTextContent = entries => {
  return entries.reduce((acc, entry) => {
    visit(entry.content, ['text', 'code'], node => {
      acc += node.value || '';
    });
    return acc;
  }, '');
};

/**
 * Determines if an entry should be included in the Table of Contents.
 * @param {import('../../metadata/types').MetadataEntry} entry
 */
const shouldIncludeEntryInToC = ({ heading }) =>
  // Only include headings with text,
  heading?.data?.text.length &&
  // and whose depth <= the maximum allowed.
  heading?.depth <= TOC_MAX_HEADING_DEPTH;

/**
 * Extracts and formats heading information from an API documentation entry.
 * @param {import('../../metadata/types').MetadataEntry} entry
 */
const extractHeading = entry => {
  const data = entry.heading.data;

  const cliFlagOrEnv = [...data.text.matchAll(/`(-[\w-]+|[A-Z0-9_]+=)/g)];

  const heading =
    cliFlagOrEnv.length > 0
      ? cliFlagOrEnv.at(-1)[1]
      : data.text
          // Remove any containing code blocks
          .replace(/`/g, '')
          // Remove any prefixes (i.e. 'Class:')
          .replace(/^[^:]+:/, '')
          // Trim the remaining whitespace
          .trim();

  return {
    depth: entry.heading.depth,
    value: heading,
    stability: parseInt(entry.stability?.data.index ?? 2),
    slug: data.slug,
    data: { id: data.slug, type: data.type },
  };
};

/**
 * Build the list of heading metadata for sidebar navigation.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries - All API metadata entries
 */
export const extractHeadings = entries =>
  entries.filter(shouldIncludeEntryInToC).map(extractHeading);
