import { buildSideBarProps } from './utils/buildBarProps.mjs';
import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { getRemarkRecma } from '../../utils/remark.mjs';

const remarkRecma = getRemarkRecma();

/**
 * Process a chunk of items in a worker thread.
 * Transforms metadata entries into JSX AST nodes.
 *
 * Each item is a SlicedModuleInput containing the head node
 * and all entries for that module - no need to recompute grouping.
 *
 * @type {import('./types').Implementation['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices, docPages) {
  const results = [];

  for (const idx of itemIndices) {
    const { head, entries } = slicedInput[idx];

    const sideBarProps = buildSideBarProps(head, docPages);

    const content = await buildContent(
      entries,
      head,
      sideBarProps,
      remarkRecma
    );

    results.push(content);
  }

  return results;
}

/**
 * Generates a JSX AST
 *
 * @type {import('./types').Implementation['generate']}
 */
export async function* generate(input, worker) {
  const config = getConfig('jsx-ast');

  const groupedModules = groupNodesByModule(input);
  const headNodes = getSortedHeadNodes(input);

  // Pre-compute docPages once in main thread
  // TODO(@avivkeller): Load the index file here instead of during configuration
  const docPages = config.index
    ? config.index.map(({ section, api }) => [section, `${api}.html`])
    : headNodes.map(node => [node.heading.data.name, `${node.api}.html`]);

  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4700+ entries to every worker
  const entries = headNodes.map(head => ({
    head,
    entries: groupedModules.get(head.api),
  }));

  for await (const chunkResult of worker.stream(entries, entries, docPages)) {
    yield chunkResult;
  }
}
