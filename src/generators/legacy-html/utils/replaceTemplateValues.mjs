'use strict';

import {
  buildToC,
  buildNavigation,
  buildVersions,
  buildGitHub,
} from './buildDropdowns.mjs';
import tableOfContents from './tableOfContents.mjs';

/**
 * Replaces the template values in the API template with the given values.
 * @param {string} apiTemplate - The HTML template string
 * @param {import('../types').TemplateValues} values - The values to replace the template values with
 * @param {Array} releases - The releases array for version dropdown
 * @param {{ skipGitHub?: boolean; skipGtocPicker?: boolean }} [options] - Optional settings
 * @returns {string} The replaced template values
 */
export const replaceTemplateValues = (
  apiTemplate,
  { api, added, section, version, toc, nav, content },
  releases,
  { skipGitHub = false, skipGtocPicker = false } = {}
) => {
  return apiTemplate
    .replace('__ID__', api)
    .replace(/__FILENAME__/g, api)
    .replace('__SECTION__', section)
    .replace(/__VERSION__/g, version)
    .replace(/__TOC__/g, tableOfContents.wrapToC(toc))
    .replace(/__GTOC__/g, nav)
    .replace('__CONTENT__', content)
    .replace(/__TOC_PICKER__/g, buildToC(toc))
    .replace(/__GTOC_PICKER__/g, skipGtocPicker ? '' : buildNavigation(nav))
    .replace('__ALTDOCS__', buildVersions(api, added, releases))
    .replace('__EDIT_ON_GITHUB__', skipGitHub ? '' : buildGitHub(api));
};
