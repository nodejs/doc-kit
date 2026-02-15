'use strict';

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';
import { minifyHTML } from '../../utils/html-minifier.mjs';
import { getRemarkRehype } from '../../utils/remark.mjs';
import legacyHtml from '../legacy-html/index.mjs';
import { replaceTemplateValues } from '../legacy-html/utils/replaceTemplateValues.mjs';
import tableOfContents from '../legacy-html/utils/tableOfContents.mjs';

/**
 * This generator generates the legacy HTML pages of the legacy API docs
 * for retro-compatibility and while we are implementing the new 'react' and 'html' generators.
 *
 * This generator is a top-level generator, and it takes the raw AST tree of the API doc files
 * and generates the HTML files to the specified output directory from the configuration settings
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'legacy-html-all',

  version: '1.0.0',

  description:
    'Generates the `all.html` file from the `legacy-html` generator, which includes all the modules in one single file',

  dependsOn: 'legacy-html',

  defaultConfiguration: {
    templatePath: legacyHtml.defaultConfiguration.templatePath,
  },

  /**
   * Generates the `all.html` file from the `legacy-html` generator
   */
  async generate(input) {
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

    // Creates a "mimic" of an `ApiDocMetadataEntry` which fulfils the requirements
    // for generating the `tableOfContents` with the `tableOfContents.parseNavigationNode` parser
    const sideNavigationFromValues = entries.map(entry => ({
      api: entry.api,
      heading: { data: { depth: 1, name: entry.section } },
    }));

    // Generates the global Table of Contents (Sidebar Navigation)
    const parsedSideNav = remarkWithRehype.processSync(
      tableOfContents(sideNavigationFromValues, {
        maxDepth: 1,
        parser: tableOfContents.parseNavigationNode,
      })
    );

    const templateValues = {
      api: 'all',
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
      result = Buffer.from(await minifyHTML(result));
    }

    if (config.output) {
      await writeFile(join(config.output, 'all.html'), result);
    }

    return result;
  },
};
