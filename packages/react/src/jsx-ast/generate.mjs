import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { groupNodesByModule } from '@doc-kit/core/utils/generators.mjs';
import { flatten } from '@doc-kit/core/utils/misc.mjs';
import { jsx, toJs } from 'estree-util-to-js';

import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { buildNotFoundPage } from './utils/synthetic/404.mjs';

/**
 * Process a chunk of items in a worker thread.
 *
 * Each item is a `{ head, entries }` descriptor (one module, one chunk page, or
 * a synthetic page). The JSX AST is built AND serialized to a code string here,
 * inside the worker, so the heavy AST is dropped in the worker and never
 * crosses back to or accumulates on the main thread. Only the code string, the
 * table of contents and the page metadata are returned.
 *
 * The code is generated a few characters at a time, so it is flattened before
 * the next page is built (see `flatten`).
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices) {
  const results = [];

  for (const idx of itemIndices) {
    const { head, entries } = slicedInput[idx];

    const { content, ...page } = await buildContent(entries, head);

    results.push({
      ...page,
      content: flatten(toJs(content, { handlers: jsx }).value),
    });
  }

  return results;
}

/**
 * Generates per-page JSX code from API metadata.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4700+ entries to every worker
  const groupedModules = groupNodesByModule(input);
  const descriptors = getSortedHeadNodes(input).map(head => ({
    head,
    entries: groupedModules.get(head.api),
  }));

  // `all.html` is not built here: it is the module pages concatenated, so the
  // `html` generator assembles it from their content instead of building
  // every module a second time.
  if (getConfig('jsx-ast').generateNotFoundPage) {
    descriptors.push(buildNotFoundPage());
  }

  for await (const chunkResult of worker.stream(descriptors)) {
    yield chunkResult;
  }
}
