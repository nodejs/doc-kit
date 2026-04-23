'use strict';

import { readFile, cp } from 'node:fs/promises';
import { basename, join } from 'node:path';

import getConfig from '#core/utils/configuration/index.mjs';
import { GITHUB_EDIT_URL } from '#core/utils/configuration/templates.mjs';
import { writeFile } from '#core/utils/file.mjs';
import { groupNodesByModule } from '#core/utils/generators.mjs';
import { minifyHTML } from '#core/utils/html-minifier.mjs';
import { getRemarkRehypeWithShiki } from '#core/utils/remark.mjs';

import buildContent from '../../utils/html/content.mjs';
import replaceTemplateValues from '../../utils/html/template.mjs';
import buildToC, {
  parseNavigationNode,
  parseToCNode,
} from '../../utils/html/toc.mjs';

export const name = 'legacy-html';
export const dependsOn = '@doc-kittens/internal/metadata';
export const defaultConfiguration = {
  templatePath: join(import.meta.dirname, 'template.html'),
  additionalPathsToCopy: [join(import.meta.dirname, 'assets')],
  ref: 'main',
  pageURL: '{baseURL}/latest-{version}/api{path}.html',
  editURL: `${GITHUB_EDIT_URL}/doc/api{path}.md`,
};

/**
 * Creates a heading object with the given name.
 * @param {string} name - The name of the heading
 * @returns {HeadingMetadataEntry} The heading object
 */
const getHeading = name => ({ depth: 1, data: { name } });

const remarkRehypeProcessor = getRemarkRehypeWithShiki();

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
      `class="nav-${head.api}`,
      `class="nav-${head.api} active`
    );

    const toc = String(
      remarkRehypeProcessor.processSync(
        buildToC(nodes, {
          maxDepth: 5,
          parser: parseToCNode,
        })
      )
    );

    const content = buildContent(headNodes, nodes, remarkRehypeProcessor);

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
    remarkRehypeProcessor.processSync(
      buildToC(indexOfFiles, {
        maxDepth: 1,
        parser: parseNavigationNode,
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
