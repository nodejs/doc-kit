import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { buildNotFoundPage } from './utils/synthetic/404.mjs';
import { buildAllPage } from './utils/synthetic/all.mjs';
import { buildIndexPage } from './utils/synthetic/index.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';

/**
 * Builds JSX content for all configured synthetic pages.
 *
 * @param {Array<import('../metadata/types').MetadataEntry>} input
 */
const buildSyntheticEntries = async input => {
  const config = getConfig('jsx-ast');

  const descriptors = [
    config.generateAllPage && buildAllPage(input),
    config.generateIndexPage && buildIndexPage(input),
    config.generateNotFoundPage && buildNotFoundPage(),
  ].filter(Boolean);

  return Promise.all(
    descriptors.map(({ head, entries }) => buildContent(entries, head))
  );
};

/**
 * Process a chunk of items in a worker thread.
 * Transforms metadata entries into JSX AST nodes.
 *
 * Each item is a SlicedModuleInput containing the head node
 * and all entries for that module - no need to recompute grouping.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices) {
  const results = [];

  for (const idx of itemIndices) {
    const { head, entries } = slicedInput[idx];

    const content = await buildContent(entries, head);

    results.push(content);
  }

  return results;
}

/**
 * Generates a JSX AST
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  // The synthetic `index` page replaces the Core `index` document.
  const moduleInput = input.filter(entry => entry.api !== 'index');

  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4700+ entries to every worker
  const groupedModules = groupNodesByModule(input);
  const entries = getSortedHeadNodes(input).map(head => ({
    head,
    entries: groupedModules.get(head.api),
  }));

  for await (const chunkResult of worker.stream(entries)) {
    yield chunkResult;
  }

  const syntheticEntries = await buildSyntheticEntries(moduleInput);

  if (syntheticEntries.length > 0) {
    yield syntheticEntries;
  }
}
