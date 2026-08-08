'use strict';

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { combine, hashData, hashValue } from '@nodejs/doc-kit/cache/hash.mjs';
import { getBuildCache } from '@nodejs/doc-kit/cache/index.mjs';
import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';
import { copyPath, writeFile } from '@nodejs/doc-kit/utils/file.mjs';
import { groupNodesByModule } from '@nodejs/doc-kit/utils/generators.mjs';
import { minifyHTML } from '@nodejs/doc-kit/utils/html-minifier.mjs';
import { getRemarkRehypeWithShiki as remark } from '@nodejs/doc-kit/utils/remark.mjs';

import buildContent from './utils/buildContent.mjs';
import { replaceTemplateValues } from './utils/replaceTemplateValues.mjs';
import tableOfContents from './utils/tableOfContents.mjs';

const GENERATOR_SPECIFIER = '@nodejs/doc-kit-generator-legacy/legacy-html';
const ITEM_NAMESPACE = 'legacy-html:item';

/**
 * Creates a heading object with the given name.
 * @param {string} name - The name of the heading
 * @returns {HeadingMetadataEntry} The heading object
 */
const getHeading = name => ({ depth: 1, data: { name } });

/**
 * Narrows the head nodes to exactly what per-module rendering reads from
 * other modules (`buildExtraContent`'s stability overview): a projection small
 * enough to hash and send to every worker, and stable under body-only edits —
 * which is what lets every other module's cache entry survive such an edit.
 *
 * @param {Array<import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry>} headNodes - All depth-1 entries, sorted
 * @returns {Array<object>} The narrowed projection
 */
const buildHeadNodesLite = headNodes =>
  headNodes.map(({ api, heading, stability }) => ({
    api,
    heading: { data: { name: heading.data.name } },
    stability: stability && {
      data: {
        index: stability.data.index,
        description: stability.data.description,
      },
    },
  }));

/**
 * Process a chunk of items in a worker thread: renders the module content
 * (Shiki highlighting included), populates the page template, and minifies —
 * so a cached module costs the main thread nothing but a file write.
 *
 * Each item is a pre-grouped `{ head, nodes }`; the shared navigation, the
 * head-node projection, and the page template arrive once per chunk as extra.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices, extra) {
  const { navigation, headNodesLite, apiTemplate } = extra;

  const config = getConfig('legacy-html');

  const results = [];

  for (const idx of itemIndices) {
    const { head, nodes } = slicedInput[idx];

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

    const content = buildContent(headNodesLite, nodes);

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

    let html = replaceTemplateValues(apiTemplate, template, config);

    if (config.minify) {
      html = await minifyHTML(html);
    }

    results.push({ ...template, html });
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
      await copyPath(path, assetsFolder);
    }
  }

  const headNodesLite = buildHeadNodesLite(headNodes);
  const items = headNodes.map(head => ({
    head,
    nodes: groupedModules.get(head.api),
  }));

  // Per-module leaf cache: a module's page is a pure function of its own
  // source file, the two global projections (navigation string, head-node
  // projection), the page template, and the chain salt (code + config). A
  // body-only edit leaves both projections unchanged, so every other module
  // hits and never runs Shiki or the minifier.
  const buildCache = getBuildCache();

  /** @type {Map<string, object>} Cached results by api */
  const cached = new Map();

  /** @type {Array<{ item: object, key: string | null }>} */
  const misses = [];

  if (buildCache) {
    const salt = buildCache.chainSalt(GENERATOR_SPECIFIER);
    const projectionHash = combine(
      hashData(navigation),
      hashValue(headNodesLite),
      hashData(apiTemplate)
    );

    for (const item of items) {
      const source = await buildCache.sourceHash(item.head.path);

      // Unknown provenance (no source file behind the entry) is uncacheable.
      const key = source
        ? combine(ITEM_NAMESPACE, salt, source, projectionHash)
        : null;

      const hit = key && (await buildCache.store.get(key));

      if (hit) {
        cached.set(item.head.api, JSON.parse(hit));
      } else {
        misses.push({ item, key });
      }
    }
  } else {
    misses.push(...items.map(item => ({ item, key: null })));
  }

  const extra = { navigation, headNodesLite, apiTemplate };

  /** @type {Map<string, object>} Freshly built results by api */
  const produced = new Map();

  let index = 0;

  // The worker yields chunks in submission order (parallel.mjs), so results
  // pair with misses positionally; results are stored write-behind.
  for await (const chunk of worker.stream(
    misses.map(({ item }) => item),
    extra
  )) {
    for (const result of chunk) {
      const { key } = misses[index++];

      if (key) {
        buildCache.store.put(key, JSON.stringify(result));
      }

      produced.set(result.api, result);
    }
  }

  // Emit in canonical (sorted head-node) order regardless of the hit/miss
  // split, so downstream aggregation (legacy-html-all) is byte-stable.
  for (const head of headNodes) {
    const result = cached.get(head.api) ?? produced.get(head.api);

    if (config.output) {
      await writeFile(join(config.output, `${result.api}.html`), result.html);
    }

    yield [result];
  }
}
