'use strict';

import { rmSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import logger from '@doc-kit/core/logger/index.mjs';
import getConfig from '@doc-kit/core/utils/configuration/index.mjs';

import { createChannel } from '../jsx-ast/utils/channel.mjs';
import { resolveBundler } from './bundlers/index.mjs';
import { copyStaticAssets } from './utils/copying.mjs';
import createProgramBuilder, { moduleFileName } from './utils/generate.mjs';
import { createPageWriter } from './utils/render.mjs';

const htmlLogger = logger.child('html');

/**
 * Main generation function: turns the pages' JSX into the static site.
 *
 * Receives `jsx-ast`'s output as `{ data, headings, readingTime, content }`
 * items, `content` being each page's JSX code, and a `{ manifest }` of every
 * page's head. The site is then built in pieces that are each as small as they
 * can be:
 *
 * 1. Each page's program is compiled (JSX to a plain module) and written to a
 * temporary directory as it arrives, so no page is held longer than that.
 * 2. Once the manifest arrives, the component library is bundled once, for the
 * server, and the client assets once; every page loads the same ones.
 * 3. A composed page (with `parts`, which come before it) imports their
 * compiled programs, so nothing is built twice.
 * 4. The worker pool imports, renders, templates, minifies and writes the
 * pages as they are compiled, one page in memory per worker.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input, worker) {
  const config = getConfig('html');

  const template = await readFile(config.templatePath, 'utf-8');

  // The built library and the compiled page programs live here until every
  // page is written; the directory is removed afterwards
  const outDir = await mkdtemp(join(tmpdir(), 'doc-kit-html-'));

  /**
   * Removes the directory if another generator's failure ends the process
   * first.
   */
  const removeOnExit = () => rmSync(outDir, { recursive: true, force: true });

  process.once('exit', removeOnExit);

  try {
    const building = buildSite(input, { worker, outDir, config, template });

    input = undefined;

    await building;
  } finally {
    process.off('exit', removeOnExit);

    await rm(outDir, { recursive: true, force: true });
  }

  await copyStaticAssets(config);
}

/**
 * Compiles each page's program into `outDir` as it arrives, bundles the
 * component library and the client assets once the manifest arrives, and has
 * the worker pool render the pages as they are compiled.
 *
 * @param {Parameters<import('./types').Generator['generate']>[0]} input
 * @param {object} options
 * @param {ParallelWorker} [options.worker] - Without it, pages are rendered on this thread
 * @param {string} options.outDir - Where the library and the programs are written
 * @param {import('./types').ResolvedWebConfiguration} options.config
 * @param {string} options.template - The page template
 * @returns {Promise<void>}
 */
const buildSite = async (input, options) => {
  // Not destructured in the parameters, so that clearing `input` below lets
  // go of it
  const { worker, outDir, config, template } = options;

  // Loaded here rather than with the generator, so the threads rendering
  // pages, which load this module too, never load what only this needs
  const { createVirtualImports } = await import('./utils/config.mjs');

  const bundler = await resolveBundler(config.bundler);
  const { buildLibraryProgram, buildPageProgram, clientProgram } =
    createProgramBuilder();

  const modulesDir = join(outDir, 'pages');
  await mkdir(modulesDir);

  // Pages are compiled before the library is built, so they import it from
  // this module, which re-exports it once it is
  const libraryURL = pathToFileURL(join(outDir, 'page-library.mjs')).href;

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

  /**
   * Bundles the component library and the client assets.
   *
   * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} heads - Every page's metadata, in the site's order
   * @returns {Promise<import('./types').ClientAssets>}
   */
  const bundle = async heads => {
    // Adapters expect an empty directory, and `outDir` holds the pages
    const libraryDir = join(outDir, 'library');
    await mkdir(libraryDir);

    const builtLibraryURL = await bundler.buildServer({
      entry: buildLibraryProgram(),
      virtualImports: createVirtualImports(heads, config.virtualImports, true),
      outDir: libraryDir,
      config,
    });

    await writeFile(
      fileURLToPath(libraryURL),
      `export * from ${JSON.stringify(builtLibraryURL)};\n`
    );

    htmlLogger.debug('Built the component library');

    const assets = await bundler.buildClient({
      entry: clientProgram,
      virtualImports: createVirtualImports(heads, config.virtualImports, false),
      config,
    });

    htmlLogger.debug('Built the client assets', assets);

    return assets;
  };

  // The compiled pages, rendered once the bundles are built
  const rendering = createChannel();

  let writing;

  /**
   * Starts bundling, then rendering the compiled pages.
   *
   * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} heads - Every page's metadata
   */
  const startWriting = heads => {
    writing = bundle(heads).then(assets =>
      createPageWriter(worker)(rendering, { template, assets })
    );

    // Awaited once every page is compiled
    writing.catch(() => {});
  };

  const compiled = [];

  // With one thread, rendering waits for every page to be compiled, and the
  // manifest is kept until then
  const writeWhileCompiling = getConfig().threads > 1;

  let manifest;

  /**
   * Compiles each page as it arrives, and hands it over to be rendered. Its
   * own function, so nothing holds the pages' code once it returns.
   *
   * @param {typeof input} pages
   */
  const compilePages = async pages => {
    for await (const items of pages) {
      const tasks = [];

      for (const item of items) {
        if ('manifest' in item) {
          if (writeWhileCompiling) {
            startWriting(item.manifest);
          } else {
            manifest = item.manifest;
          }

          continue;
        }

        const task = await compile(item);

        compiled.push(task);
        tasks.push(task);
      }

      if (tasks.length > 0) {
        rendering.push(tasks);
      }
    }
  };

  try {
    const compiling = compilePages(input);

    input = undefined;

    await compiling;

    // With one thread, or without a manifest
    if (!writing) {
      startWriting(manifest ?? compiled.map(({ data }) => data));

      manifest = undefined;
    }

    htmlLogger.debug(`Compiled ${compiled.length} page programs`);
  } catch (error) {
    // Pages still waiting for a worker aren't written
    rendering.clear();

    throw error;
  } finally {
    rendering.end();

    // The bundler and the workers may still use `outDir`, removed after this
    await writing?.catch(() => {});
  }

  await writing;
};
