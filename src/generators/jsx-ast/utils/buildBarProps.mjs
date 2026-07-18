'use strict';

import { visit } from 'unist-util-visit';

import { getFullName } from './signature.mjs';
import { TOC_MAX_HEADING_DEPTH } from '../constants.mjs';

// Callable heading types whose ToC label should be the bare function name
// rather than the full signature.
const FUNCTION_HEADING_TYPES = new Set(['method', 'ctor', 'classMethod']);

// Deprecation codes are part of the heading label, not a generic type prefix.
const DEPRECATION_HEADING_REGEX = /^DEP\d+:/;

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
 * Builds the display label for a heading in the Table of Contents.
 *
 * Callables collapse to their bare name (e.g. `fs.read` rather than the full
 * `fs.read(fd, buffer, offset, length, position, callback)` signature). All
 * other headings keep their plain text, with CLI flags / env vars and leading
 * prefixes (i.e. `Class:`) stripped.
 *
 * @param {import('../../metadata/types').HeadingData} data
 */
const headingLabel = data => {
  if (FUNCTION_HEADING_TYPES.has(data.type)) {
    const name = getFullName(data, data.name);

    return data.type === 'ctor' ? `new ${name}` : name;
  }

  const cliFlagOrEnv = [...data.text.matchAll(/`(-[\w-]+|[A-Z0-9_]+=)/g)];

  if (cliFlagOrEnv.length > 0) {
    return cliFlagOrEnv.at(-1)[1];
  }

  if (DEPRECATION_HEADING_REGEX.test(data.text)) {
    return data.text.replace(/`/g, '').trim();
  }

  return (
    data.text
      // Remove any containing code blocks
      .replace(/`/g, '')
      // Remove any prefixes (i.e. 'Class:')
      .replace(/^[^:]+:/, '')
      // Trim the remaining whitespace
      .trim()
  );
};

/**
 * Extracts and formats heading information from an API documentation entry.
 * @param {import('../../metadata/types').MetadataEntry} entry
 */
const extractHeading = entry => {
  const data = entry.heading.data;

  return {
    depth: entry.heading.depth,
    value: headingLabel(data),
    stability: parseInt(entry.stability?.data.index ?? 2),
    slug: data.slug,
    data: { id: data.slug, type: data.type },
  };
};

/**
 * Build the list of heading metadata for sidebar navigation. Overload headings
 * are dropped so each function contributes a single entry.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries - All API metadata entries
 */
export const extractHeadings = entries =>
  entries
    .filter(shouldIncludeEntryInToC)
    .filter(({ heading }) => !heading.data.isOverload)
    .map(extractHeading);
