'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';
import { writeFile } from '@nodejs/doc-kit/utils/file.mjs';

import {
  convertOptionToMandoc,
  convertEnvVarToMandoc,
} from './utils/converter.mjs';

/**
 * @param {Array<import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry>} components
 * @param {number} start
 * @param {number} end
 * @param {(element: import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry) => string} convert
 * @returns {string}
 */
function extractMandoc(components, start, end, convert) {
  return components
    .slice(start, end)
    .filter(({ heading }) => heading.depth === 3)
    .map(convert)
    .join('');
}

/**
 * Generates the Node.js man-page
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('man-page');

  // Find the appropriate headers
  const optionsStart = input.findIndex(
    ({ heading }) => heading.data.slug === config.cliOptionsHeaderSlug
  );

  const environmentStart = input.findIndex(
    ({ heading }) => heading.data.slug === config.envVarsHeaderSlug
  );

  // The first header that is <3 in depth after environmentStart
  const environmentEnd = input.findIndex(
    ({ heading }, index) => heading.depth < 3 && index > environmentStart
  );

  const output = {
    // Extract the CLI options.
    options: extractMandoc(
      input,
      optionsStart + 1,
      environmentStart,
      convertOptionToMandoc
    ),
    // Extract the environment variables.
    env: extractMandoc(
      input,
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
}
