'use strict';

import { readFile, cp } from 'node:fs/promises';
import { basename, join } from 'node:path';

import buildContent from './utils/buildContent.mjs';
import { replaceTemplateValues } from './utils/replaceTemplateValues.mjs';
import tableOfContents from './utils/tableOfContents.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { writeFile } from '../../utils/file.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { minifyHTML } from '../../utils/html-minifier.mjs';
import { getRemarkRehypeWithShiki as remark } from '../../utils/remark.mjs';

/**
 * Creates a heading object with the given name.
 * @param {string} name - The name of the heading
 * @returns {HeadingMetadataEntry} The heading object
 */
const getHeading = name => ({ depth: 1, data: { name } });

/**
 * Process a chunk of items in a worker thread.
 * Builds HTML template objects - FS operations happen in generate().
 *
 * Each item is pre-grouped {head, nodes, headNodes} - no need to
 * recompute groupNodesByModule for every chunk.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices, navigation) {
  const results = [];

  for (const idx of itemIndices) {
    const { head, nodes, headNodes } = slicedInput[idx];

    const nav = navigation.replace(
      `class="nav-${head.api}"`,
      `class="nav-${head.api} active"`
    );

    const toc = String(
      remark().processSync(
        tableOfContents(nodes, {
          maxDepth: 5,
          parser: tableOfContents.parseToCNode,
        })
      )
    );

    const content = buildContent(headNodes, nodes);

    const apiAsHeading = head.api.charAt(0).toUpperCase() + head.api.slice(1);

    const template = {
      api: head.api,
      path: head.path,
      added: head.introduced_in ?? '',
      section: head.heading.data.name || apiAsHeading,
      toc,
      nav,
      content,
    };

    results.push(template);
  }

  return results;
}

/**
 * Generates the legacy version of the API docs in HTML
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  const config = getConfig('legacy-html');

  const apiTemplate = await readFile(config.templatePath, 'utf-8');

  const groupedModules = groupNodesByModule(input);

  const headNodes = input
    .filter(node => node.heading.depth === 1)
    .toSorted((a, b) => a.heading.data.name.localeCompare(b.heading.data.name));

  const indexOfFiles = config.index
    ? config.index.map(({ api, section }) => ({
        api,
        heading: getHeading(section),
      }))
    : headNodes;

  const navigation = String(
    remark().processSync(
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

      // Copy all files from assets folder to output
      await cp(path, assetsFolder, { recursive: true });
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
  for await (const chunkResult of worker.stream(entries, navigation)) {
    // Write files for this chunk in the generate method (main thread)
    if (config.output) {
      for (const template of chunkResult) {
        let result = replaceTemplateValues(apiTemplate, template, config);

        if (config.minify) {
          result = await minifyHTML(result);
        }

        await writeFile(join(config.output, `${template.api}.html`), result);
      }
    }

    yield chunkResult;
  }
}
