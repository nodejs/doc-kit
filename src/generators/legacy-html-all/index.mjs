'use strict';

import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import HTMLMinifier from '@minify-html/node';

import { getRemarkRehype } from '../../utils/remark.mjs';
import dropdowns from '../legacy-html/utils/buildDropdowns.mjs';
import tableOfContents from '../legacy-html/utils/tableOfContents.mjs';

/**
 * @typedef {{
 * api: string;
 * added: string;
 * section: string;
 * version: string;
 * toc: string;
 * nav: string;
 * content: string;
 * }} TemplateValues
 *
 * This generator generates the legacy HTML pages of the legacy API docs
 * for retro-compatibility and while we are implementing the new 'react' and 'html' generators.
 *
 * This generator is a top-level generator, and it takes the raw AST tree of the API doc files
 * and generates the HTML files to the specified output directory from the configuration settings
 *
 * @typedef {Array<TemplateValues>} Input
 *
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'legacy-html-all',

  version: '1.0.0',

  description:
    'Generates the `all.html` file from the `legacy-html` generator, which includes all the modules in one single file',

  dependsOn: 'legacy-html',

  /**
   * Generates the `all.html` file from the `legacy-html` generator
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { version, releases, output }) {
    const inputWithoutIndex = input.filter(entry => entry.api !== 'index');

    // Gets a Remark Processor that parses Markdown to minified HTML
    const remarkWithRehype = getRemarkRehype();

    // Current directory path relative to the `index.mjs` file
    // from the `legacy-html` generator, as all the assets are there
    const baseDir = resolve(import.meta.dirname, '..', 'legacy-html');

    // Reads the API template.html file to be used as a base for the HTML files
    const apiTemplate = await readFile(join(baseDir, 'template.html'), 'utf-8');

    // Aggregates all individual Table of Contents into one giant string
    const aggregatedToC = inputWithoutIndex.map(entry => entry.toc).join('\n');

    // Aggregates all individual content into one giant string
    const aggregatedContent = inputWithoutIndex
      .map(entry => entry.content)
      .join('\n');

    // Creates a "mimic" of an `ApiDocMetadataEntry` which fulfils the requirements
    // for generating the `tableOfContents` with the `tableOfContents.parseNavigationNode` parser
    const sideNavigationFromValues = inputWithoutIndex.map(entry => ({
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

    const generatedAllTemplate = apiTemplate
      .replace('__ID__', 'all')
      .replace(/__FILENAME__/g, 'all')
      .replace('__SECTION__', 'All')
      .replace(/__VERSION__/g, `v${version.version}`)
      .replace(/__TOC__/g, tableOfContents.wrapToC(aggregatedToC))
      .replace(/__GTOC__/g, parsedSideNav)
      .replace('__CONTENT__', aggregatedContent)
      .replace(/__TOC_PICKER__/g, dropdowns.buildToC(aggregatedToC))
      .replace(/__GTOC_PICKER__/g, '')
      .replace('__ALTDOCS__', dropdowns.buildVersions('all', '', releases))
      .replace('__EDIT_ON_GITHUB__', '');

    // We minify the html result to reduce the file size and keep it "clean"
    const minified = HTMLMinifier.minify(Buffer.from(generatedAllTemplate), {});

    if (output) {
      await writeFile(join(output, 'all.html'), minified);
    }

    return minified;
  },
};
