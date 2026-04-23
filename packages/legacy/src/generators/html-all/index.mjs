'use strict';

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '#core/utils/configuration/index.mjs';
import { minifyHTML } from '#core/utils/html-minifier.mjs';
import { getRemarkRehype } from '#core/utils/remark.mjs';

import replaceTemplateValues from '../../utils/html/template.mjs';
import buildToC, { parseNavigationNode } from '../../utils/html/toc.mjs';
import { defaultConfiguration as legacyHtmlDefaults } from '../html/index.mjs';

export const name = 'legacy-html-all';
export const dependsOn = '@doc-kittens/legacy/html';
export const defaultConfiguration = {
  templatePath: legacyHtmlDefaults.templatePath,
};

/**
 * Generates the `all.html` file from the `legacy-html` generator
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('legacy-html-all');

  // Gets a Remark Processor that parses Markdown to minified HTML
  const remarkWithRehype = getRemarkRehype();

  // Reads the API template.html file to be used as a base for the HTML files
  const apiTemplate = await readFile(config.templatePath, 'utf-8');

  // Filter out index entries and extract needed properties
  const entries = input.filter(entry => entry.api !== 'index');

  // Aggregates all individual Table of Contents into one giant string
  const aggregatedToC = entries.map(entry => entry.toc).join('\n');

  // Aggregates all individual content into one giant string
  const aggregatedContent = entries.map(entry => entry.content).join('\n');

  // Creates a "mimic" of an `MetadataEntry` which fulfils the requirements
  // for generating the `tableOfContents` with the `tableOfContents.parseNavigationNode` parser
  const sideNavigationFromValues = entries.map(entry => ({
    api: entry.api,
    heading: { data: { depth: 1, name: entry.section } },
  }));

  // Generates the global Table of Contents (Sidebar Navigation)
  const parsedSideNav = remarkWithRehype.processSync(
    buildToC(sideNavigationFromValues, {
      maxDepth: 1,
      parser: parseNavigationNode,
    })
  );

  const templateValues = {
    api: 'all',
    path: 'all',
    added: '',
    section: 'All',
    version: `v${config.version.version}`,
    toc: aggregatedToC,
    nav: String(parsedSideNav),
    content: aggregatedContent,
  };

  let result = replaceTemplateValues(apiTemplate, templateValues, config, {
    skipGitHub: true,
    skipGtocPicker: true,
  });

  if (config.minify) {
    result = await minifyHTML(result);
  }

  if (config.output) {
    await writeFile(join(config.output, 'all.html'), result);
  }

  return result;
}
