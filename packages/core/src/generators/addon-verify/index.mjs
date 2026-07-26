'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * This generator generates a file list from code blocks extracted from
 * `doc/api/addons.md` to facilitate C++ compilation and JavaScript runtime
 * validations.
 *
 * @type {import('./types').Generator}
 */
export default await createLazyGenerator({
  name: 'addon-verify',

  description:
    'Generates a file list from code blocks extracted from `doc/api/addons.md` to facilitate C++ compilation and JavaScript runtime validations',

  dependsOn: 'metadata',
});
