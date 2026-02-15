'use strict';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

import minifyHtml from '@minify-html/node';

import buildContent from './utils/buildContent.mjs';
import { replaceTemplateValues } from './utils/replaceTemplateValues.mjs';
import { safeCopy } from './utils/safeCopy.mjs';
import tableOfContents from './utils/tableOfContents.mjs';
import getConfig from '../../utils/configuration/index.mjs';
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
 *
 * This generator generates the legacy HTML pages of the legacy API docs
 * for retro-compatibility and while we are implementing the new 'react' and 'html' generators.
 *
 * This generator is a top-level generator, and it takes the raw AST tree of the API doc files
 * and generates the HTML files to the specified output directory from the configuration settings
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'legacy-html',

  version: '1.0.0',

  description:
    'Generates the legacy version of the API docs in HTML, with the assets and styles included as files',

  dependsOn: 'metadata',

  defaultConfiguration: {
    templatePath: join(import.meta.dirname, 'template.html'),
    additionalPathsToCopy: [join(import.meta.dirname, 'assets')],
    ref: 'main',
  },

  /**
   * Process a chunk of items in a worker thread.
   * Builds HTML template objects - FS operations happen in generate().
   *
   * Each item is pre-grouped {head, nodes, headNodes} - no need to
   * recompute groupNodesByModule for every chunk.
   */
  async processChunk(slicedInput, itemIndices, navigation) {
    const results = [];

    for (const idx of itemIndices) {
      const { head, nodes, headNodes } = slicedInput[idx];

      const nav = navigation.replace(
        `class="nav-${head.api}`,
        `class="nav-${head.api} active`
      );

      const toc = String(
        remarkRehypeProcessor.processSync(
          tableOfContents(nodes, {
            maxDepth: 4,
            parser: tableOfContents.parseToCNode,
          })
        )
      );

      const content = buildContent(headNodes, nodes, remarkRehypeProcessor);

      const apiAsHeading = head.api.charAt(0).toUpperCase() + head.api.slice(1);

      const template = {
        api: head.api,
        added: head.introduced_in ?? '',
        section: head.heading.data.name || apiAsHeading,
        toc,
        nav,
        content,
      };

      results.push(template);
    }

    return results;
  },

  /**
   * Generates the legacy version of the API docs in HTML
   */
  async *generate(input, worker) {
    const config = getConfig('legacy-html');

    const apiTemplate = await readFile(config.templatePath, 'utf-8');

    const groupedModules = groupNodesByModule(input);

    const headNodes = input
      .filter(node => node.heading.depth === 1)
      .toSorted((a, b) =>
        a.heading.data.name.localeCompare(b.heading.data.name)
      );

    const indexOfFiles = config.index
      ? config.index.map(({ api, section }) => ({
          api,
          heading: getHeading(section),
        }))
      : headNodes;

    const navigation = String(
      remarkRehypeProcessor.processSync(
        tableOfContents(indexOfFiles, {
          maxDepth: 1,
          parser: tableOfContents.parseNavigationNode,
        })
      )
    );

    if (config.output) {
      for (const path of config.additionalPathsToCopy) {
        // Define the output folder for API docs assets
        const assetsFolder = join(config.output, basename(path));

        // Creates the assets folder if it does not exist
        await mkdir(assetsFolder, { recursive: true });

        // Copy all files from assets folder to output, skipping unchanged files
        await safeCopy(path, assetsFolder);
      }
    }

    // Create sliced input: each item contains head + its module's entries + headNodes reference
    // This avoids sending all ~4900 entries to every worker and recomputing groupings
    const entries = headNodes.map(head => ({
      head,
      nodes: groupedModules.get(head.api),
      headNodes,
    }));

    // Stream chunks as they complete - HTML files are written immediately
    for await (const chunkResult of worker.stream(
      entries,
      entries,
      navigation
    )) {
      // Write files for this chunk in the generate method (main thread)
      if (config.output) {
        for (const template of chunkResult) {
          let result = replaceTemplateValues(apiTemplate, template, config);

          if (config.minify) {
            result = Buffer.from(minifyHtml.minify(Buffer.from(result), {}));
          }

          await writeFile(join(config.output, `${template.api}.html`), result);
        }
      }

      yield chunkResult;
    }
  },
};
