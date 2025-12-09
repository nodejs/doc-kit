'use strict';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import HTMLMinifier from '@minify-html/node';

import buildContent from './utils/buildContent.mjs';
import { replaceTemplateValues } from './utils/replaceTemplateValues.mjs';
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

const remarkRehypeProcessor = getRemarkRehypeWithShiki();

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

  processChunk: Object.assign(
    /**
     * Process a chunk of items in a worker thread.
     * Builds HTML template objects - FS operations happen in generate().
     *
     * With sliceInput, each item is pre-grouped {head, nodes, headNodes} - no need to
     * recompute groupNodesByModule for every chunk.
     *
     * @param {Array<{head: ApiDocMetadataEntry, nodes: ApiDocMetadataEntry[], headNodes: ApiDocMetadataEntry[]}>} slicedInput - Pre-sliced module data
     * @param {number[]} itemIndices - Indices into the sliced array
     * @param {{version: string, parsedSideNav: string}} options - Dependencies passed from generate()
     * @returns {Promise<TemplateValues[]>} Template objects for each processed module
     */
    async (slicedInput, itemIndices, { version, parsedSideNav }) => {
      const results = [];

      for (const idx of itemIndices) {
        const { head, nodes, headNodes } = slicedInput[idx];

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

        const apiAsHeading =
          head.api.charAt(0).toUpperCase() + head.api.slice(1);

        const template = {
          api: head.api,
          added: head.introduced_in ?? '',
          section: head.heading.data.name || apiAsHeading,
          version: `v${version.version}`,
          toc: String(parsedToC),
          nav: String(activeSideNav),
          content: parsedContent,
        };

        results.push(template);
      }

      return results;
    },
    { sliceInput: true }
  ),

  /**
   * Generates the legacy version of the API docs in HTML
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Array<TemplateValues>>}
   */
  async *generate(input, { index, releases, version, output, worker }) {
    const baseDir = import.meta.dirname;

    const apiTemplate = await readFile(join(baseDir, 'template.html'), 'utf-8');

    const groupedModules = groupNodesByModule(input);

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

    // Create sliced input: each item contains head + its module's entries + headNodes reference
    // This avoids sending all ~4900 entries to every worker and recomputing groupings
    const slicedInput = headNodes.map(head => ({
      head,
      nodes: groupedModules.get(head.api),
      headNodes,
    }));

    const deps = {
      version,
      parsedSideNav: String(parsedSideNav),
    };

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

    // Stream chunks as they complete - HTML files are written immediately
    for await (const chunkResult of worker.stream(
      slicedInput,
      slicedInput,
      deps
    )) {
      // Write files for this chunk in the generate method (main thread)
      if (output) {
        for (const template of chunkResult) {
          const result = replaceTemplateValues(apiTemplate, template, releases);

          const minified = HTMLMinifier.minify(Buffer.from(result), {});

          await writeFile(join(output, `${template.api}.html`), minified);
        }
      }

      yield chunkResult;
    }
  },
};
