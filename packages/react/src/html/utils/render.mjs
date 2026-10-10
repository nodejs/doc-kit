'use strict';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import logger from '@doc-kit/core/logger/index.mjs';
import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { minifyHTML } from '@doc-kit/core/utils/html-minifier.mjs';
import { omitKeys } from '@doc-kit/core/utils/misc.mjs';

import { pageFileName, populatePage } from './processing.mjs';

const renderLogger = logger.child('html');

/**
 * Renders and writes a chunk of pages. This is the `html` generator's worker
 * entry point.
 *
 * Each page is a compiled program on disk (see `buildPageProgram`): it is
 * imported, rendered to HTML with its layout props, placed in the template,
 * minified when configured, and written to the output directory — one page at
 * a time, and nothing comes back but the file name. A worker therefore holds
 * one page at once, plus the component library it imported the first time, and
 * the whole run's memory scales with the largest page rather than with the
 * site.
 *
 * @param {Array<import('../types').PageTask>} tasks
 * @param {Array<number>} indices - The tasks to process
 * @param {{ template: string, assets: import('../types').ClientAssets }} extra
 * @returns {Promise<Array<string>>} The written file names
 */
export const processChunk = async (tasks, indices, { template, assets }) => {
  const config = getConfig('html');

  const written = [];

  for (const index of indices) {
    const { moduleURL, data, headings, readingTime, minify } = tasks[index];

    const { default: render } = await import(moduleURL);

    // The metadata is the head without the node children
    const metadata = omitKeys(data, [
      'content',
      'heading',
      'stability',
      'changes',
    ]);

    let html = populatePage({
      template,
      data,
      dehydrated: await render({ metadata, headings, readingTime }),
      assets,
    });

    if (config.minify && minify !== false) {
      html = await minifyHTML(html);
    }

    const fileName = pageFileName(data);
    const path = join(config.output, fileName);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, html);

    written.push(fileName);
  }

  return written;
};

/**
 * Creates the page writer: it spreads the pages across the worker pool and
 * waits for every one to be written. Without a pool — the generator was called
 * directly rather than by the orchestrator — the pages are rendered on the
 * calling thread instead.
 *
 * @param {ParallelWorker} [worker]
 * @returns {(tasks: Array<import('../types').PageTask>, extra: { template: string, assets: import('../types').ClientAssets }) => Promise<void>}
 */
export const createPageWriter = worker => async (tasks, extra) => {
  const chunks = worker
    ? worker.stream(tasks, extra)
    : [await processChunk(tasks, [...tasks.keys()], extra)];

  let count = 0;

  for await (const chunk of chunks) {
    count += chunk.length;

    renderLogger.debug(`Wrote ${count}/${tasks.length} pages`);
  }
};
