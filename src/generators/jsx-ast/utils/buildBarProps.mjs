'use strict';

import { visit } from 'unist-util-visit';

import { TOC_MAX_HEADING_DEPTH } from '../constants.mjs';

const SHORT_SIGNATURE_TYPES = new Set(['classMethod', 'ctor', 'method']);

/**
 * Formats a full heading label for the table of contents.
 * @param {import('../../metadata/types').HeadingData} data
 */
const formatHeading = data =>
  data.text
    // Remove any containing code blocks
    .replace(/`/g, '')
    // Remove any prefixes (i.e. 'Class:')
    .replace(/^[^:]+:/, '')
    // Trim the remaining whitespace
    .trim();

/**
 * Shortens method-like headings so the table of contents remains scannable.
 * @param {import('../../metadata/types').HeadingData} data
 */
const formatCodeHeading = data => {
  const code = data.text.match(/`([^`]+)`/)?.[1] ?? data.text;
  const signatureStart = code.indexOf('(');

  if (signatureStart === -1) {
    return code.replace(/`/g, '').trim();
  }

  return `${code.slice(0, signatureStart).replace(/^new\s+/, '')}()`;
};

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
 * @param {string} heading
 */
const extractHeading = (entry, heading) => {
  const data = entry.heading.data;

  return {
    depth: entry.heading.depth,
    value: heading,
    stability: parseInt(entry.stability?.data.index ?? 2),
    slug: data.slug,
    data: { id: data.slug, type: data.type },
  };
};

/**
 * Extracts both the full heading and the optional compact heading candidate.
 * @param {import('../../metadata/types').MetadataEntry} entry
 */
const prepareHeading = entry => {
  const data = entry.heading.data;
  const cliFlagOrEnv = [...data.text.matchAll(/`(-[\w-]+|[A-Z0-9_]+=)/g)];

  if (cliFlagOrEnv.length > 0) {
    return { entry, heading: cliFlagOrEnv.at(-1)[1], compactHeading: null };
  }

  return {
    entry,
    heading: formatHeading(data),
    compactHeading: SHORT_SIGNATURE_TYPES.has(data.type)
      ? formatCodeHeading(data)
      : null,
  };
};

/**
 * Build the list of heading metadata for sidebar navigation.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries - All API metadata entries
 */
export const extractHeadings = entries => {
  const headings = entries.filter(shouldIncludeEntryInToC).map(prepareHeading);
  const compactHeadingCounts = Map.groupBy(
    headings.filter(({ compactHeading }) => compactHeading),
    ({ compactHeading }) => compactHeading
  );

  return headings.map(({ entry, heading, compactHeading }) =>
    extractHeading(
      entry,
      compactHeading && compactHeadingCounts.get(compactHeading).length === 1
        ? compactHeading
        : heading
    )
  );
};
