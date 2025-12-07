'use strict';

import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import HTMLMinifier from '@minify-html/node';

import { getRemarkRehype } from '../../utils/remark.mjs';
import { replaceTemplateValues } from '../legacy-html/utils/replaceTemplateValues.mjs';
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
   * Process a chunk of template values from the dependency.
   * Extracts toc and content from each entry for aggregation.
   * @param {Input} fullInput
   * @param {number[]} itemIndices
   */
  processChunk(fullInput, itemIndices) {
    const results = [];

    for (const idx of itemIndices) {
      const entry = fullInput[idx];

      // Skip the index entry
      if (entry.api === 'index') {
        continue;
      }

      results.push({
        api: entry.api,
        section: entry.section,
        toc: entry.toc,
        content: entry.content,
      });
    }

    return results;
  },

  /**
   * Generates the `all.html` file from the `legacy-html` generator
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Array<{api: string; section: string; toc: string; content: string}>>}
   */
  async *generate(input, { version, releases, output, worker }) {
    // Collect all chunks as they stream in
    const allChunks = [];

    for await (const chunkResult of worker.stream(input, input, {})) {
      allChunks.push(...chunkResult);

      yield chunkResult;
    }

    // After all chunks are collected, build and write the final file
    if (output) {
      // Gets a Remark Processor that parses Markdown to minified HTML
      const remarkWithRehype = getRemarkRehype();

      // Current directory path relative to the `index.mjs` file
      // from the `legacy-html` generator, as all the assets are there
      const baseDir = resolve(import.meta.dirname, '..', 'legacy-html');

      // Reads the API template.html file to be used as a base for the HTML files
      const apiTemplate = await readFile(
        join(baseDir, 'template.html'),
        'utf-8'
      );

      // Aggregates all individual Table of Contents into one giant string
      const aggregatedToC = allChunks.map(entry => entry.toc).join('\n');

      // Aggregates all individual content into one giant string
      const aggregatedContent = allChunks
        .map(entry => entry.content)
        .join('\n');

      // Creates a "mimic" of an `ApiDocMetadataEntry` which fulfils the requirements
      // for generating the `tableOfContents` with the `tableOfContents.parseNavigationNode` parser
      const sideNavigationFromValues = allChunks.map(entry => ({
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
        version: `v${version.version}`,
        toc: aggregatedToC,
        nav: String(parsedSideNav),
        content: aggregatedContent,
      };

      const generatedAllTemplate = replaceTemplateValues(
        apiTemplate,
        templateValues,
        releases,
        { skipGitHub: true, skipGtocPicker: true }
      );

      // We minify the html result to reduce the file size and keep it "clean"
      const minified = HTMLMinifier.minify(Buffer.from(generatedAllTemplate));

      await writeFile(join(output, 'all.html'), minified);
    }
  },
};
