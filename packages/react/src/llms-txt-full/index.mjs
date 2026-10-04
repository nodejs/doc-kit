'use strict';

import llmsTxt from '../llms-txt/index.mjs';
import { generate } from './generate.mjs';

/**
 * This generator generates a llms-full.txt file holding the Markdown of every
 * page, for LLMs to read the whole documentation in one request
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'llms-txt-full',

  description:
    'Generates a llms-full.txt file holding the Markdown of every page, each preceded by its URL',

  dependsOn: '@doc-kit/core/metadata',

  defaultConfiguration: {
    pageURL: llmsTxt.defaultConfiguration.pageURL,
  },

  generate,
};
