'use strict';

import { coerce, compare, major } from 'semver';

import { DOC_API_BASE_URL_VERSION } from '../constants.mjs';

/**
 * Groups all the API metadata nodes by module (`api` property) so that we can process each different file
 * based on the module it belongs to.
 *
 * @param {Array<ApiDocMetadataEntry>} nodes The API metadata Nodes to be grouped
 */
export const groupNodesByModule = nodes => {
  /** @type {Map<string, Array<ApiDocMetadataEntry>>} */
  const groupedNodes = new Map();

  for (const node of nodes) {
    if (!groupedNodes.has(node.api)) {
      groupedNodes.set(node.api, []);
    }

    groupedNodes.get(node.api).push(node);
  }

  return groupedNodes;
};

/**
 * Parses the SemVer string into a Node.js-alike version
 *
 * @param {import('semver').SemVer} version The version to be parsed
 */
export const getVersionFromSemVer = version =>
  version.minor === 0
    ? `${version.major}.x`
    : `${version.major}.${version.minor}.x`;

/**
 * Gets the documentation URL for an API and version
 *
 * @param {string} version The version to be parsed
 * @param {string} api The document
 */
export const getVersionURL = (version, api) =>
  `${DOC_API_BASE_URL_VERSION}${version}/api/${api}.html`;

/**
 * @TODO: This should not be necessary, and indicates errors within the API docs
 * @TODO: Hookup into a future Validation/Linting API
 *
 * This is a safe fallback to ensure that we always have a SemVer compatible version
 * even if the input is not a valid SemVer string
 *
 * @param {string|import('semver').SemVer} version SemVer compatible version (maybe)
 * @returns {import('semver').SemVer} SemVer compatible version
 */
export const coerceSemVer = version => {
  const coercedVersion = coerce(version);

  if (coercedVersion === null) {
    // @TODO: Linter to complain about invalid SemVer strings
    return coerce('0.0.0-REPLACEME');
  }

  return coercedVersion;
};

/**
 * Gets compatible versions for an entry
 *
 * @param {string | import('semver').SemVer} introduced
 * @param {Array<ApiDocReleaseEntry>} releases
 * @param {Boolean} [includeNonMajor=false]
 * @returns {Array<ApiDocReleaseEntry>}
 */
export const getCompatibleVersions = (introduced, releases) => {
  const coercedMajor = major(coerceSemVer(introduced));
  // All Node.js versions that support the current API; If there's no "introduced_at" field,
  // we simply show all versions, as we cannot pinpoint the exact version
  return releases.filter(release => release.version.major >= coercedMajor);
};

/**
 * Maps `updates` into `changes` format, merges them and sorts them by version
 * ç
 * @param {Array<ApiDocMetadataChange>} changes Changes to be merged into updates
 * @param {[string='version']} key The key where versions are stored
 * @returns {Array<ApiDocMetadataChange>} Mapped, merged and sorted changes
 */
export const sortChanges = (changes, key = 'version') => {
  // Sorts the updates and changes by the first version on a given entry
  return changes.sort((a, b) => {
    const aVersion = Array.isArray(a[key]) ? a[key][0] : a[key];
    const bVersion = Array.isArray(b[key]) ? b[key][0] : b[key];

    return compare(coerceSemVer(aVersion), coerceSemVer(bVersion));
  });
};
