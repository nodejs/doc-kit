'use strict';

import { coerce, major } from 'semver';

/**
 * Groups all the API metadata nodes by module (`api` property) so that we can process each different file
 * based on the module it belongs to.
 *
 * @param {Array<import('@doc-kittens/internal/src/generators/metadata/types').MetadataEntry>} nodes The API metadata Nodes to be grouped
 */
export const groupNodesByModule = nodes => {
  /** @type {Map<string, Array<import('@doc-kittens/internal/src/generators/metadata/types').MetadataEntry>>} */
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
 * @param {Array<import('../parsers/types').ReleaseEntry>} releases
 * @param {Boolean} [includeNonMajor=false]
 * @returns {Array<import('../parsers/types').ReleaseEntry>}
 */
export const getCompatibleVersions = (introduced, releases) => {
  const coercedMajor = major(coerceSemVer(introduced));
  // All Node.js versions that support the current API; If there's no "introduced_at" field,
  // we simply show all versions, as we cannot pinpoint the exact version
  return releases.filter(release => release.version.major >= coercedMajor);
};

/**
 * Assigns properties from one or more source objects to the target object
 * **without overwriting existing keys** in the target.
 *
 * Similar to `Object.assign`, but preserves the target's existing keys.
 * The target object is mutated in place.
 *
 * @param {Object} target - The object to assign properties to.
 * @param {Object} source - The source object
 */
export const leftHandAssign = (target, source) =>
  Object.keys(source).forEach(k => k in target || (target[k] = source[k]));
