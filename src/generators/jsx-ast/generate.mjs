import { jsx, toJs } from 'estree-util-to-js';

import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { buildNotFoundPage } from './utils/synthetic/404.mjs';
import { buildAllPage } from './utils/synthetic/all.mjs';
import { buildIndexPage } from './utils/synthetic/index.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';

/**
 * Builds the `{ head, entries }` page descriptors for all configured synthetic
 * pages. The descriptors are cheap to build; the expensive `buildContent` step
 * runs later in a worker (via `processChunk`), so the very large synthetic
 * `all` page is never built on the main thread.
 *
 * @param {Array<import('../metadata/types').MetadataEntry>} input
 */
const buildSyntheticDescriptors = input => {
  const config = getConfig('jsx-ast');

  return [
    config.generateAllPage && buildAllPage(input),
    config.generateIndexPage && buildIndexPage(input),
    config.generateNotFoundPage && buildNotFoundPage(config),
  ].filter(Boolean);
};

/**
 * Process a chunk of items in a worker thread.
 *
 * Each item is a `{ head, entries }` descriptor (one module, or a synthetic
 * page). The JSX AST is built AND serialized to a code string here, inside the
 * worker, so the heavy AST — most notably the giant `all` page, which
 * concatenates every module — is dropped in the worker and never crosses back
 * to or accumulates on the main thread. Only the much smaller code string and
 * the page metadata are returned.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices) {
  const results = [];

  for (const idx of itemIndices) {
    const { head, entries } = slicedInput[idx];

    const content = await buildContent(entries, head);

    const { value: code } = toJs(content, { handlers: jsx });

    results.push({ data: content.data, code });
  }

  return results;
}

/**
 * Generates per-page JSX code from API metadata.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  // The synthetic `index` page replaces the Core `index` document.
  const moduleInput = input.filter(entry => entry.api !== 'index');

  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4700+ entries to every worker
  const groupedModules = groupNodesByModule(input);
  const descriptors = getSortedHeadNodes(input).map(head => ({
    head,
    entries: groupedModules.get(head.api),
  }));

  // Process the synthetic pages through the worker pool as well, so their
  // (potentially enormous) content is built and converted off the main thread.
  descriptors.push(...buildSyntheticDescriptors(moduleInput));

  for await (const chunkResult of worker.stream(descriptors)) {
    yield chunkResult;
  }
}
