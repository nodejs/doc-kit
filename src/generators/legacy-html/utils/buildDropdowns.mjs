'use strict';

import { DOC_API_BLOB_EDIT_BASE_URL } from '../../../constants.mjs';
import {
  getCompatibleVersions,
  getVersionFromSemVer,
  getVersionURL,
} from '../../../utils/generators.mjs';

/**
 * Builds the Dropdown for the current Table of Contents
 *
 * Note.: We use plain strings here instead of HAST, since these are just
 * templates and not actual content that needs to be transformed.
 *
 * @param {string} tableOfContents The stringified ToC
 */
export const buildToC = tableOfContents => {
  if (tableOfContents.length) {
    return (
      `<li class="picker-header"><a href="#toc-picker" aria-controls="toc-picker">` +
      `<span class="picker-arrow"></span>` +
      `Table of contents</a><div class="picker">` +
      `<div class="toc" tabindex="-1">${tableOfContents.replace('<ul', '<ul id="toc-picker"')}</div></div></li>`
    );
  }

  return '';
};

/**
 * Builds the Navigation Dropdown for the current file
 *
 * Note.: We use plain strings here instead of HAST, since these are just
 * templates and not actual content that needs to be transformed.
 *
 * @param {string} navigationContents The stringified Navigation
 */
export const buildNavigation = navigationContents =>
  `<li class="picker-header"><a href="#gtoc-picker" aria-controls="gtoc-picker">` +
  `<span class="picker-arrow"></span>Index</a>` +
  `<div class="picker" tabindex="-1" id="gtoc-picker"><ul><li><a href="index.html">Index</a>` +
  `</li></ul><hr class="line" />${navigationContents}</div></li>`;

/**
 * Generates the dropdown for viewing the current API doc in different versions
 *
 * Note.: We use plain strings here instead of HAST, since these are just
 * templates and not actual content that needs to be transformed.
 *
 * @param {string} api The current API node name
 * @param {string} added The version the API was added
 * @param {Array<ApiDocReleaseEntry>} versions All available Node.js releases
 */
export const buildVersions = (api, added, versions) => {
  const compatibleVersions = getCompatibleVersions(added, versions);

  // Parses the SemVer version into something we use for URLs and to display the Node.js version
  // Then we create a `<li>` entry for said version, ensuring we link to the correct API doc
  const versionsAsList = compatibleVersions.map(({ version, isLts }) => {
    const parsedVersion = getVersionFromSemVer(version);

    const ltsLabel = isLts ? '<b>LTS</b>' : '';

    return `<li><a href="${getVersionURL(parsedVersion, api)}">${parsedVersion} ${ltsLabel}</a></li>`;
  });

  return (
    `<li class="picker-header"><a href="#alt-docs" aria-controls="alt-docs">` +
    `<span class="picker-arrow"></span>Other versions</a>` +
    `<div class="picker" tabindex="-1"><ol id="alt-docs">${versionsAsList.join('')}</ol></div></li>`
  );
};

/**
 * Builds the "Edit on GitHub" link for the current API doc
 *
 * Note.: We use plain strings here instead of HAST, since these are just
 * templates and not actual content that needs to be transformed.
 *
 * @param {string} api The current API node name
 */
export const buildGitHub = api =>
  `<li class="edit_on_github">` +
  `<a href="${DOC_API_BLOB_EDIT_BASE_URL}${api}.md">` +
  `Edit on GitHub</a></li>`;
