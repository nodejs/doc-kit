'use strict';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import HTMLMinifier from '@minify-html/node';

import buildContent from './utils/buildContent.mjs';
import dropdowns from './utils/buildDropdowns.mjs';
import { safeCopy } from './utils/safeCopy.mjs';
import tableOfContents from './utils/tableOfContents.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { getRemarkRehypeWithShiki } from '../../utils/remark.mjs';

/**
 * Creates a heading object with the given name.
 * @param {string} name - The name of the heading
 * @returns {HeadingMetadataEntry} The heading object
 */
const getHeading = name => ({ data: { depth: 1, name } });

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
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, Array<TemplateValues>>}
 */
export default {
  name: 'legacy-html',

  version: '1.0.0',

  description:
    'Generates the legacy version of the API docs in HTML, with the assets and styles included as files',

  dependsOn: 'metadata',

  /**
   * Process a chunk of items in a worker thread.
   * @param {Input} fullInput
   * @param {number[]} itemIndices
   * @param {Partial<GeneratorOptions>} options
   */
  async processChunk(
    fullInput,
    itemIndices,
    { releases, version, output, apiTemplate, parsedSideNav }
  ) {
    const remarkRehypeProcessor = getRemarkRehypeWithShiki();
    const groupedModules = groupNodesByModule(fullInput);

    const headNodes = fullInput
      .filter(node => node.heading.depth === 1)
      .sort((a, b) => a.heading.data.name.localeCompare(b.heading.data.name));

    /**
     * Replaces the template values in the API template with the given values.
     * @param {TemplateValues} values - The values to replace the template values with
     * @returns {string} The replaced template values
     */
    const replaceTemplateValues = values => {
      const { api, added, section, version, toc, nav, content } = values;

      return apiTemplate
        .replace('__ID__', api)
        .replace(/__FILENAME__/g, api)
        .replace('__SECTION__', section)
        .replace(/__VERSION__/g, version)
        .replace(/__TOC__/g, tableOfContents.wrapToC(toc))
        .replace(/__GTOC__/g, nav)
        .replace('__CONTENT__', content)
        .replace(/__TOC_PICKER__/g, dropdowns.buildToC(toc))
        .replace(/__GTOC_PICKER__/g, dropdowns.buildNavigation(nav))
        .replace('__ALTDOCS__', dropdowns.buildVersions(api, added, releases))
        .replace('__EDIT_ON_GITHUB__', dropdowns.buildGitHub(api));
    };

    const results = [];

    for (const idx of itemIndices) {
      const head = headNodes[idx];
      const nodes = groupedModules.get(head.api);

      const activeSideNav = String(parsedSideNav).replace(
        `class="nav-${head.api}`,
        `class="nav-${head.api} active`
      );

      const parsedToC = remarkRehypeProcessor.processSync(
        tableOfContents(nodes, {
          maxDepth: 4,
          parser: tableOfContents.parseToCNode,
        })
      );

      const parsedContent = buildContent(
        headNodes,
        nodes,
        remarkRehypeProcessor
      );

      const apiAsHeading = head.api.charAt(0).toUpperCase() + head.api.slice(1);

      const generatedTemplate = {
        api: head.api,
        added: head.introduced_in ?? '',
        section: head.heading.data.name || apiAsHeading,
        version: `v${version.version}`,
        toc: String(parsedToC),
        nav: String(activeSideNav),
        content: parsedContent,
      };

      if (output) {
        // We minify the html result to reduce the file size and keep it "clean"
        const result = replaceTemplateValues(generatedTemplate);
        const minified = HTMLMinifier.minify(Buffer.from(result), {});

        await writeFile(join(output, `${head.api}.html`), minified);
      }

      results.push(generatedTemplate);
    }

    return results;
  },

  /**
   * Generates the legacy version of the API docs in HTML
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { index, releases, version, output, worker }) {
    const remarkRehypeProcessor = getRemarkRehypeWithShiki();

    const baseDir = import.meta.dirname;

    const apiTemplate = await readFile(join(baseDir, 'template.html'), 'utf-8');

    const headNodes = input
      .filter(node => node.heading.depth === 1)
      .sort((a, b) => a.heading.data.name.localeCompare(b.heading.data.name));

    const indexOfFiles = index
      ? index.map(({ api, section }) => ({ api, heading: getHeading(section) }))
      : headNodes;

    const parsedSideNav = remarkRehypeProcessor.processSync(
      tableOfContents(indexOfFiles, {
        maxDepth: 1,
        parser: tableOfContents.parseNavigationNode,
      })
    );

    const generatedValues = await worker.map(headNodes, input, {
      index,
      releases,
      version,
      output,
      apiTemplate,
      parsedSideNav: String(parsedSideNav),
    });

    if (output) {
      // Define the source folder for API docs assets
      const srcAssets = join(baseDir, 'assets');

      // Define the output folder for API docs assets
      const assetsFolder = join(output, 'assets');

      // Creates the assets folder if it does not exist
      await mkdir(assetsFolder, { recursive: true });

      // Copy all files from assets folder to output, skipping unchanged files
      await safeCopy(srcAssets, assetsFolder);
    }

    return generatedValues;
  },
};
