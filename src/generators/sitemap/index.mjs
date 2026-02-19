'use strict';

/**
 * This generator generates a sitemap.xml file for search engine optimization
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'sitemap',

  version: '1.0.0',

  description: 'Generates a sitemap.xml file for search engine optimization',

  dependsOn: 'metadata',
};
