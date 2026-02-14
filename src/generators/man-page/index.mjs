'use strict';

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  convertOptionToMandoc,
  convertEnvVarToMandoc,
} from './utils/converter.mjs';
import getConfig from '../../utils/configuration/index.mjs';

/**
 * This generator generates a man page version of the CLI.md file.
 * See https://man.openbsd.org/mdoc.7 for the formatting.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'man-page',

  version: '1.0.0',

  description: 'Generates the Node.js man-page.',

  dependsOn: 'metadata',

  defaultConfiguration: {
    fileName: 'node.1',
    cliOptionsHeaderSlug: 'options',
    envVarsHeaderSlug: 'environment-variables-1',
    templatePath: join(import.meta.dirname, 'template.1'),
  },

  /**
   * Generates the Node.js man-page
   */
  async generate(input) {
    const config = getConfig('man-page');

    // Filter to only 'cli'.
    const components = input.filter(({ api }) => api === 'cli');

    if (!components.length) {
      throw new Error('Could not find any `cli` documentation.');
    }

    // Find the appropriate headers
    const optionsStart = components.findIndex(
      ({ slug }) => slug === config.cliOptionsHeaderSlug
    );

    const environmentStart = components.findIndex(
      ({ slug }) => slug === config.envVarsHeaderSlug
    );

    // The first header that is <3 in depth after environmentStart
    const environmentEnd = components.findIndex(
      ({ heading }, index) => heading.depth < 3 && index > environmentStart
    );

    const output = {
      // Extract the CLI options.
      options: extractMandoc(
        components,
        optionsStart + 1,
        environmentStart,
        convertOptionToMandoc
      ),
      // Extract the environment variables.
      env: extractMandoc(
        components,
        environmentStart + 1,
        environmentEnd,
        convertEnvVarToMandoc
      ),
    };

    const template = await readFile(config.templatePath, 'utf-8');

    const filledTemplate = template
      .replace('__OPTIONS__', output.options)
      .replace('__ENVIRONMENT__', output.env);

    if (config.output) {
      await writeFile(join(config.output, config.fileName), filledTemplate);
    }

    return filledTemplate;
  },
};

/**
 * @param {Array<ApiDocMetadataEntry>} components
 * @param {number} start
 * @param {number} end
 * @param {(element: ApiDocMetadataEntry) => string} convert
 * @returns {string}
 */
function extractMandoc(components, start, end, convert) {
  return components
    .slice(start, end)
    .filter(({ heading }) => heading.depth === 3)
    .map(convert)
    .join('');
}
