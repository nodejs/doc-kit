'use strict';

import getConfig from '#core/utils/configuration/index.mjs';
import { populate } from '#core/utils/configuration/templates.mjs';
import {
  getCompatibleVersions,
  getVersionFromSemVer,
} from '#core/utils/generators.mjs';

import toc from './toc.mjs';

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
 * @param {string} path The current API node name
 * @param {string} added The version the API was added
 * @param {Array<import('#core/parsers/types').ReleaseEntry>} versions All available Node.js releases
 */
export const buildVersions = (path, added, versions) => {
  const config = getConfig('legacy-html');

  const compatibleVersions = getCompatibleVersions(added, versions);

  // Parses the SemVer version into something we use for URLs and to display the Node.js version
  // Then we create a `<li>` entry for said version, ensuring we link to the correct API doc
  const versionsAsList = compatibleVersions.map(({ version, isLts }) => {
    const parsedVersion = getVersionFromSemVer(version);
    const href = populate(config.pageURL, {
      ...config,
      path,
      version: `v${parsedVersion}`,
    });

    const ltsLabel = isLts ? '<b>LTS</b>' : '';

    return `<li><a href="${href}">${parsedVersion} ${ltsLabel}</a></li>`;
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
 * @param {string} url
 */
const buildGitHub = url =>
  `<li class="edit_on_github">` +
  `<a href="${url}">` +
  `Edit on GitHub</a></li>`;

/**
 * Replaces the template values in the API template with the given values.
 * @param {string} apiTemplate - The HTML template string
 * @param {import('../../generators/html/types').TemplateValues} values - The values to replace the template values with
 * @param {import('#core/utils/configuration/types').GlobalConfiguration} config
 * @param {{ skipGitHub?: boolean; skipGtocPicker?: boolean }} [options] - Optional settings
 * @returns {string} The replaced template values
 */
const replaceTemplateValues = (
  apiTemplate,
  { path, api, added, section, toc: tocContent, nav, content },
  config,
  { skipGitHub = false, skipGtocPicker = false } = {}
) => {
  return apiTemplate
    .replace('__ID__', api)
    .replace(/__FILENAME__/g, api)
    .replace('__SECTION__', section)
    .replace(/__VERSION__/g, `v${config.version.version}`)
    .replace(/__TOC__/g, toc.wrapToC(tocContent))
    .replace(/__GTOC__/g, nav)
    .replace('__CONTENT__', content)
    .replace(/__TOC_PICKER__/g, buildToC(tocContent))
    .replace(/__GTOC_PICKER__/g, skipGtocPicker ? '' : buildNavigation(nav))
    .replace('__ALTDOCS__', buildVersions(path, added, config.changelog))
    .replace(
      '__EDIT_ON_GITHUB__',
      skipGitHub
        ? ''
        : buildGitHub(populate(config.editURL, { ...config, path }))
    );
};

export default replaceTemplateValues;
