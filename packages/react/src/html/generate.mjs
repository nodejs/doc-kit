'use strict';

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import logger from '@doc-kit/core/logger/index.mjs';
import getConfig from '@doc-kit/core/utils/configuration/index.mjs';

import { resolveBundler } from './bundlers/index.mjs';
import { buildAllPage } from './utils/all.mjs';
import { copyStaticAssets } from './utils/copying.mjs';
import createProgramBuilder, { moduleFileName } from './utils/generate.mjs';
import { createPageWriter } from './utils/render.mjs';

const htmlLogger = logger.child('html');

/**
 * Main generation function: turns the pages' JSX into the static site.
 *
 * Receives `jsx-ast`'s output as `{ data, headings, readingTime, content }`
 * items, `content` being each page's JSX code. The site is then built in
 * pieces that are each as small as they can be:
 *
 * 1. The component library is bundled once, for the server.
 * 2. The client assets are bundled once; every page loads the same ones.
 * 3. Each page's program is compiled (JSX to a plain module) and written to a
 * temporary directory, one at a time, so no page is held longer than that.
 * 4. `all.html`, when enabled, is a program that imports the module pages'
 * content, so it is compiled from what was already compiled.
 * 5. The worker pool imports, renders, templates, minifies and writes the
 * pages, one page in memory per worker.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input, worker) {
  const config = getConfig('html');

  const template = await readFile(config.templatePath, 'utf-8');

  const pages = [...input];
  const all = config.generateAllPage ? buildAllPage(pages) : undefined;

  // Every page's metadata, in render order — the sidebar, the index and the
  // cross links need the whole set.
  const datas = [...pages, ...(all ? [all] : [])].map(({ data }) => data);

  // Loaded here rather than with the generator, so the threads rendering
  // pages, which load this module too, never load what only this needs
  const { createVirtualImports } = await import('./utils/config.mjs');

  const bundler = await resolveBundler(config.bundler);
  const { buildLibraryProgram, buildPageProgram, clientProgram } =
    createProgramBuilder();

  // The built library and the compiled page programs live here until every
  // page is written; the directory is removed afterwards
  const outDir = await mkdtemp(join(tmpdir(), 'doc-kit-html-'));

  try {
    const libraryURL = await bundler.buildServer({
      entry: buildLibraryProgram(),
      virtualImports: createVirtualImports(datas, config.virtualImports, true),
      outDir,
      config,
    });

    htmlLogger.debug('Built the component library');

    const assets = await bundler.buildClient({
      entry: clientProgram,
      virtualImports: createVirtualImports(datas, config.virtualImports, false),
      config,
    });

    htmlLogger.debug('Built the client assets', assets);

    const modulesDir = join(outDir, 'pages');
    await mkdir(modulesDir);

    /**
     * Compiles a page's program to disk and describes it for the workers.
     *
     * @param {import('./types').Page} page
     * @returns {Promise<import('./types').PageTask>}
     */
    const compile = async page => {
      const file = join(modulesDir, moduleFileName(page.data.api));

      await writeFile(
        file,
        await bundler.compile(
          buildPageProgram(page, libraryURL),
          `${page.data.api}.jsx`
        )
      );

      const { data, headings, readingTime } = page;

      return {
        moduleURL: pathToFileURL(file).href,
        data,
        headings,
        readingTime,
      };
    };

    const tasks = [];

    for (const page of pages) {
      tasks.push(await compile(page));
    }

    // The composed page imports the other pages' compiled programs, which
    // exist from here on, so it is rendered by the worker pool alongside them.
    // Rendering it on this thread instead would hold the whole site in it and
    // block the pool from shutting down its idle workers until it is done.
    // It goes first: it takes by far the longest, so the other pages are
    // rendered while it is.
    //
    // It is not minified. The minifier's memory grows to about twelve times
    // the page it is given and is never returned, and this page is the whole
    // site: minifying the Node.js docs' ~35MB `all.html` takes ~400MB and over
    // a second, for a page 2% smaller once compressed.
    if (all) {
      const allTask = await compile(all);

      tasks.unshift({ ...allTask, minify: false });
    }

    htmlLogger.debug(`Compiled ${tasks.length} page programs`);

    await createPageWriter(worker)(tasks, { template, assets });
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }

  await copyStaticAssets(config);
}
