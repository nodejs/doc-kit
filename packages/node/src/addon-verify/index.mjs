'use strict';

import { generate } from './generate.mjs';

/**
 * This generator generates a file list from code blocks extracted from
 * `doc/api/addons.md` to facilitate C++ compilation and JavaScript runtime
 * validations.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'addon-verify',

  description:
    'Generates a file list from code blocks extracted from `doc/api/addons.md` to facilitate C++ compilation and JavaScript runtime validations',

  dependsOn: '@doc-kit/core/metadata',

  generate,
};
