'use strict';

import { minifyHTML } from '@doc-kit/core/utils/html-minifier.mjs';

/**
 * Minifies a chunk of rendered pages. This is the `html` generator's worker
 * entry point: minifying is the one CPU-bound step of the bundle that scales
 * with the number of pages, and it parallelizes trivially — so it runs in the
 * worker pool rather than serially on the main thread.
 *
 * @param {Array<[string, string]>} pages - `[fileName, html]` pairs
 * @param {Array<number>} indices - The pairs to process
 * @returns {Promise<Array<[string, string]>>} The minified pairs
 */
export const processChunk = (pages, indices) =>
  Promise.all(
    indices.map(async index => {
      const [fileName, html] = pages[index];

      return [fileName, await minifyHTML(html)];
    })
  );

/**
 * Creates the page minifier handed to the bundler: it distributes the pages
 * across the worker pool and collects the results as they complete. Without a
 * pool — the generator was called directly rather than by the orchestrator —
 * the pages are minified on the calling thread instead.
 *
 * @param {ParallelWorker} [worker]
 * @returns {import('../types').ClientBundleOptions['minifyPages']}
 */
export const createPageMinifier = worker => async pages => {
  const items = [...pages];

  const chunks = worker
    ? worker.stream(items)
    : [await processChunk(items, [...items.keys()])];

  const minified = new Map();

  for await (const chunk of chunks) {
    for (const [fileName, html] of chunk) {
      minified.set(fileName, html);
    }
  }

  return minified;
};
