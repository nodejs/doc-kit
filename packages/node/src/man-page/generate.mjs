'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';

import {
  convertOptionToMandoc,
  convertEnvVarToMandoc,
} from './utils/converter.mjs';

/**
 * @param {string} items
 */
const toList = items => `.Bl -tag -width 6n\n${items}.El`;

/**
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries
 */
function buildOptions(entries) {
  const groups = [{ title: undefined, items: '' }];

  for (const entry of entries) {
    // Is it the start of a flag?
    if (entry.heading.data.text.startsWith('`-')) {
      groups.at(-1).items += convertOptionToMandoc(entry);
    // Is it a group?
    } else if (entry.heading.depth === 3) {
      groups.push({ title: entry.heading.data.text, items: '' });
    }
  }

  return groups
    .filter(({ items }) => items)
    .map(({ title, items }) =>
      title ? `.Ss ${title}\n${toList(items)}` : toList(items)
    )
    .join('\n');
}

/**
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} entries
 */
function buildEnvironment(entries) {
  const items = entries
    .filter(({ heading }) => heading.depth === 3)
    .map(convertEnvVarToMandoc)
    .join('');

  return items && toList(items);
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

  // The first header that is <3 in depth after environmentStart,
  // or the end of the input when the section is the last one
  const nextSectionStart = input.findIndex(
    ({ heading }, index) => heading.depth < 3 && index > environmentStart
  );

  const environmentEnd =
    nextSectionStart === -1 ? input.length : nextSectionStart;

  const output = {
    // Extract the CLI options.
    options: buildOptions(input.slice(optionsStart + 1, environmentStart)),
    // Extract the environment variables.
    environment: buildEnvironment(
      input.slice(environmentStart + 1, environmentEnd)
    ),
  };

  const template = await readFile(config.templatePath, 'utf-8');

  const filledTemplate = populate(template, output);

  if (config.output) {
    await writeFile(join(config.output, config.fileName), filledTemplate);
  }

  return filledTemplate;
}
