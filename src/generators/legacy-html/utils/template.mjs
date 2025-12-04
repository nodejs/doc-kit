'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import dropdowns from './buildDropdowns.mjs';
import tableOfContents from './tableOfContents.mjs';

// Cached template (loaded once per worker)
let cachedTemplate;

/**
 * Gets the template for the legacy HTML pages (cached per process/worker)
 * @returns {Promise<string>}
 */
export const getTemplate = async () => {
  if (!cachedTemplate) {
    cachedTemplate = await readFile(
      join(import.meta.dirname, '..', 'template.html'),
      'utf-8'
    );
  }

  return cachedTemplate;
};

/**
 * Creates a template replacer function
 * @param {string} template
 * @param {Array<ApiDocReleaseEntry>} releases
 * @returns {(values: TemplateValues) => string}
 */
export const createTemplateReplacer = (template, releases) => values => {
  const { api, added, section, version, toc, nav, content } = values;

  return template
    .replace('__ID__', api)
    .replace(/__FILENAME__/g, api)
    .replace('__SECTION__', section)
    .replace(/__VERSION__/g, version)
    .replace(/__TOC__/g, tableOfContents.wrapToC(toc))
    .replace(/__GTOC__/g, nav)
    .replace('__CONTENT__', content)
    .replace(/__TOC_PICKER__/g, dropdowns.buildToC(toc))
    .replace(/__GTOC_PICKER__/g, dropdowns.buildNavigation(nav))
    .replace('__ALTDOCS__', dropdowns.buildVersions(api, added, releases))
    .replace('__EDIT_ON_GITHUB__', dropdowns.buildGitHub(api));
};
