'use strict';

import { createLazyGenerator } from '../../utils/generators.mjs';
import web from '../web/index.mjs';

/**
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'web-all',

  version: '1.0.0',

  description: 'Generates the additional files from the `web` generator',

  dependsOn: 'metadata',

  defaultConfiguration: {
    templatePath: web.defaultConfiguration.templatePath,
  },
});
