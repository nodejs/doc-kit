'use strict';

/**
 * This generator is responsible for generating the Orama database for the
 * API docs. It is based on the legacy-json generator.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'orama-db',

  version: '1.0.0',

  description: 'Generates the Orama database for the API docs.',

  dependsOn: 'metadata',
};
