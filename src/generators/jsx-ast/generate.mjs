import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';

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

    // Preserve the raw section entries so downstream generators (e.g. `web`)
    // can build synthetic pages (all.html, index.html) without recomputing
    // metadata.
    content.sectionEntries = entries;

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
  const groupedModules = groupNodesByModule(input);

  const headNodes = getSortedHeadNodes(input);

  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4700+ entries to every worker
  const entries = headNodes.map(head => ({
    head,
    entries: groupedModules.get(head.api),
  }));

  for await (const chunkResult of worker.stream(entries)) {
    yield chunkResult;
  }
}
