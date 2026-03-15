'use strict';

import readingTime from 'reading-time';
import { visit } from 'unist-util-visit';

import getConfig from '../../../utils/configuration/index.mjs';
import { populate } from '../../../utils/configuration/templates.mjs';
import {
  getCompatibleVersions,
  getVersionFromSemVer,
} from '../../../utils/generators.mjs';
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

/**
 * Builds metadata for the meta bar (right panel).
 *
 * @param {import('../../metadata/types').MetadataEntry} head - Main API metadata entry (used as reference point)
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries - All documentation entries for a given API item
 */
export const buildMetaBarProps = (head, entries) => {
  const config = getConfig('jsx-ast');

  return {
    headings: extractHeadings(entries),
    addedIn: head.added || head.introduced_in || '',
    readingTime: readingTime(extractTextContent(entries)).text,
    viewAs: [
      ['JSON', `${head.basename}.json`],
      ['MD', `${head.basename}.md`],
    ],
    editThisPage: populate(config.editURL, { ...config, path: head.path }),
  };
};

/**
 * Converts a compatible version entry into a version label and link.
 *
 * @param {Array<import('../../../parsers/types').ReleaseEntry>} compatibleVersions - Compatible versions
 * @param {string} path - path for the version URL
 */
export const formatVersionOptions = (compatibleVersions, path) => {
  const config = getConfig('jsx-ast');

  return compatibleVersions.map(({ version, isLts, isCurrent }) => {
    let label = `v${getVersionFromSemVer(version)}`;

    const value = populate(config.pageURL, {
      ...config,
      path,
      version: label,
    });

    if (isLts) {
      label += ' (LTS)';
    }

    if (isCurrent) {
      label += ' (Current)';
    }

    return {
      value,
      label,
    };
  });
};

/**
 * Builds metadata for the sidebar (left panel).
 *
 * @param {import('../../metadata/types').MetadataEntry} entry - Current documentation entry
 * @param {Array<[string, string]>} docPages - Available doc pages for sidebar navigation
 */
export const buildSideBarProps = (entry, docPages) => {
  const config = getConfig('jsx-ast');

  const compatibleVersions = getCompatibleVersions(
    entry.introduced_in,
    config.changelog,
    true
  );

  return {
    versions: formatVersionOptions(compatibleVersions, entry.path),
    currentVersion: `v${config.version.version}`,
    pathname: `${entry.basename}.html`,
    docPages,
  };
};
