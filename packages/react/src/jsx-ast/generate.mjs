import { isMainThread } from 'node:worker_threads';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import {
  groupNodesByModule,
  groupWholeModules,
  merge,
} from '@doc-kit/core/utils/generators.mjs';
import { jsx, toJs } from 'estree-util-to-js';

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
 * Each page starts building once all of its module's entries have arrived, and
 * is emitted once built, in the order the pages arrived, the synthetic pages
 * last: the `html` generator puts them in the order the site lists them.
 *
 * Once every page has arrived, without waiting for the pages still being
 * built, it also emits `{ manifest }`: every page's head, in that same order,
 * so that `html` can prepare what needs the whole site in the meantime.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  // `all.html` is not built here: it is the module pages concatenated, so the
  // `html` generator assembles it from their content instead of building
  // every module a second time.
  const synthetic = getConfig('jsx-ast').generateNotFoundPage
    ? [buildNotFoundPage()]
    : [];

  const manifest = Promise.withResolvers();

  /**
   * Describes each arriving page by its head and its module's entries, so a
   * worker gets only what its page needs, not all 4700+ entries. Once every
   * page has arrived, it resolves the manifest and describes the synthetic
   * pages.
   *
   * @returns {AsyncGenerator<Array<{ head: object, entries: Array<object> }>>}
   */
  async function* describe() {
    const heads = [];

    // A page needs all of its module's entries
    for await (const entries of groupWholeModules(input)) {
      const groupedModules = groupNodesByModule(entries);
      const descriptors = entries
        .filter(node => node.heading.depth === 1)
        .map(head => ({ head, entries: groupedModules.get(head.api) }));

      heads.push(...descriptors.map(({ head }) => head));

      yield descriptors;
    }

    manifest.resolve([...heads, ...synthetic.map(({ head }) => head)]);

    if (synthetic.length > 0) {
      yield synthetic;
    }
  }

  /**
   * Gives the manifest, once every page has arrived.
   *
   * @returns {AsyncGenerator<Array<{ manifest: Array<object> }>>}
   */
  async function* announce() {
    const heads = await manifest.promise;

    yield [{ manifest: heads }];
  }

  // The manifest goes out as soon as it's ready, not after the next pages
  yield* merge(worker.stream(describe()), announce());
}
