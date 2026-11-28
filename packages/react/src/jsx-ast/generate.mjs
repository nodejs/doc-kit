import { isMainThread } from 'node:worker_threads';

import { DISABLED_SECTION } from '@doc-kit/core/incremental/section.mjs';
import { createChannel } from '@doc-kit/core/utils/channel.mjs';
import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { groupNodesByModule } from '@doc-kit/core/utils/generators.mjs';
import { jsx, toJs } from 'estree-util-to-js';

import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { merge } from './utils/merge.mjs';
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
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices) {
  // Loaded on first use rather than with the generator, so the main thread,
  // which never builds a page, does not load what building one takes
  const { default: buildContent } = await import('./utils/buildContent.mjs');

  const results = [];

  for (const idx of itemIndices) {
    // Building a page changes its entries. A worker has its own copy, but on
    // the main thread they're the metadata other generators read too
    const { head, entries } = isMainThread
      ? structuredClone(slicedInput[idx])
      : slicedInput[idx];

    const { content, ...page } = await buildContent(entries, head);

    results.push({ ...page, content: toJs(content, { handlers: jsx }).value });
  }

  return results;
}

/**
 * Generates per-page JSX code from API metadata.
 *
 * Pages are emitted as they are built, in the order they arrive, the synthetic
 * pages last. Once the input ends, `{ manifest }` lists every page's head in
 * the site's order, without waiting for the pages still being built. An
 * incremental build only builds the pages whose entries changed.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(
  input,
  worker,
  { incremental = DISABLED_SECTION } = {}
) {
  // `all.html` is not built here: it is the module pages concatenated, so the
  // `html` generator assembles it from their content instead of building
  // every module a second time.
  const synthetic = getConfig('jsx-ast').generateNotFoundPage
    ? [buildNotFoundPage()]
    : [];

  const manifest = Promise.withResolvers();
  const described = createChannel();

  /**
   * Describes each page by its head and its module's entries. It reads ahead
   * of `worker.stream`, which waits for room before taking a batch, so the
   * manifest is known as soon as the input ends.
   */
  const describe = async () => {
    const heads = [];

    try {
      // A module's entries arrive in one batch
      for await (const entries of input) {
        const groupedModules = groupNodesByModule(entries);
        const arrived = entries.filter(node => node.heading.depth === 1);

        heads.push(...arrived);

        // A worker gets its module's entries, not all 4700+
        described.push(
          arrived.map(head => ({ head, entries: groupedModules.get(head.api) }))
        );
      }

      manifest.resolve([
        ...getSortedHeadNodes(heads),
        ...synthetic.map(({ head }) => head),
      ]);

      if (synthetic.length > 0) {
        described.push(synthetic);
      }
    } finally {
      described.end();
    }
  };

  /**
   * Yields the manifest once it is known.
   *
   * @returns {AsyncGenerator<Array<{ manifest: Array<object> }>>}
   */
  async function* announce() {
    const heads = await manifest.promise;

    yield [{ manifest: heads }];
  }

  // The input's failure reaches the output through the manifest
  describe().catch(error => manifest.reject(error));

  const pages = incremental.reuse(described, stale => worker.stream(stale));

  yield* merge(pages, announce());
}
