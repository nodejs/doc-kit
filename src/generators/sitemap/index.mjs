'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator generates a sitemap.xml file for search engine optimization
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'sitemap',

  version: '1.0.0',

  description: 'Generates a sitemap.xml file for search engine optimization',

  dependsOn: 'metadata',
});
