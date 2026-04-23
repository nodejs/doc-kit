'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator consolidates data from the `legacy-json` generator into a single
 * JSON file (`all.json`).
 *
 * @type {import('./types.d.ts').Generator}
 */
export default createLazyGenerator({
  name: 'legacy-json-all',

  version: '1.0.0',

  description:
    'Generates the `all.json` file from the `legacy-json` generator, which includes all the modules in one single file.',

  dependsOn: 'legacy-json',

  defaultConfiguration: {
    minify: false,
  },
});
