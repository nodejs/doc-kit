'use strict';

import { generate } from './generate.mjs';

/**
 * This generator generates a sitemap.xml file for search engine optimization
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'sitemap',

  description: 'Generates a sitemap.xml file for search engine optimization',

  dependsOn: '@nodejs/doc-kit/metadata',

  defaultConfiguration: {
    indexURL: '{baseURL}/',
    pageURL: '{indexURL}{path}.html',
  },

  generate,
};
