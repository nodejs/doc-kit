'use strict';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'metadata',

  version: '1.0.0',

  description: 'generates a flattened list of API doc metadata entries',

  dependsOn: 'ast',

  defaultConfiguration: {
    typeMap: import.meta.resolve('./typeMap.json'),
  },
};
