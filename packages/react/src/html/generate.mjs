'use strict';

import { rmSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import logger from '@doc-kit/core/logger/index.mjs';
import { createChannel } from '@doc-kit/core/utils/channel.mjs';
import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { toBatches } from '@doc-kit/core/utils/generators.mjs';

import { headingSortFn } from '../jsx-ast/utils/getSortedHeadNodes.mjs';
import { resolveBundler } from './bundlers/index.mjs';
import { copyStaticAssets } from './utils/copying.mjs';
import createProgramBuilder, { moduleFileName } from './utils/generate.mjs';
import { createPageWriter } from './utils/render.mjs';

const htmlLogger = logger.child('html');

/**
 * Main generation function: turns the pages' JSX into the static site.
 *
 * Receives `jsx-ast`'s pages as it builds them, `content` being each page's JSX
 * code, and a `{ manifest }` of every page's head once it knows them all. Each
 * page's program is compiled to a plain module as it arrives, the component
 * library and the client assets are bundled once every page's metadata is
 * known, and the worker pool renders the pages as they are compiled, one in
 * memory per worker. A page made of other pages' content (with `parts`, which
 * come before it) imports their compiled programs, and is rendered first. With
 * one thread, the input arrives whole.
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
   * before this one returns.
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
 * Compiles every page's program into `outDir` as the pages arrive, bundles the
 * component library and the client assets as soon as every page's metadata is
 * known, and has the worker pool render the pages as they are compiled.
 *
 * @param {Parameters<import('./types').Generator['generate']>[0]} input - The pages and the manifest, as they arrive, or all at once with one thread
 * @param {object} options
 * @param {ParallelWorker} [options.worker] - Renders the pages; without it, they are rendered on this thread
 * @param {string} options.outDir - Where the library and the programs are written
 * @param {import('./types').ResolvedWebConfiguration} options.config
 * @param {string} options.template - The page template
 * @returns {Promise<void>}
 */
const buildSite = async (input, options) => {
  // Destructured here rather than in the parameters: with a destructuring
  // parameter, the arguments keep their own copy of `input`, which letting go
  // of `input` below would not let go of
  const { worker, outDir, config, template } = options;

  // Loaded here rather than with the generator, so the threads rendering
  // pages, which load this module too, never load what only this needs
  const { createVirtualImports } = await import('./utils/config.mjs');

  const bundler = await resolveBundler(config.bundler);
  const { buildLibraryProgram, buildPageProgram, clientProgram } =
    createProgramBuilder();

  const modulesDir = join(outDir, 'pages');
  await mkdir(modulesDir);

  // Pages are compiled before the library is built, so they import it through
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
   * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} heads - Every page's metadata, in the order the pages arrived
   * @returns {Promise<import('./types').ClientAssets>}
   */
  const bundle = async heads => {
    // Every page's metadata, in the order the site lists the pages — the
    // sidebar, the index and the cross links need the whole set
    const datas = [
      ...heads.filter(data => !data.synthetic).toSorted(headingSortFn),
      ...heads.filter(data => data.synthetic),
    ];

    // An empty directory of its own: the compiled pages are already in `outDir`
    const libraryDir = join(outDir, 'library');
    await mkdir(libraryDir);

    const builtLibraryURL = await bundler.buildServer({
      entry: buildLibraryProgram(),
      virtualImports: createVirtualImports(datas, config.virtualImports, true),
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
      virtualImports: createVirtualImports(datas, config.virtualImports, false),
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

    // Thrown once every compiled page has been handed over
    writing.catch(() => {});
  };

  const compiled = [];

  // With one thread, pages are rendered on this thread once all are compiled,
  // so the manifest is kept until then
  let manifest;

  const alongside = getConfig().threads > 1;

  /**
   * Compiles each page as it arrives, and hands it over. A function of its
   * own, so that once it returns nothing holds the pages' code.
   *
   * @param {typeof input} pages
   */
  const compilePages = async pages => {
    for await (const items of toBatches(pages)) {
      const tasks = [];

      for (const item of items) {
        if ('manifest' in item) {
          if (alongside) {
            startWriting(item.manifest);
          } else {
            manifest = item.manifest;
          }

          continue;
        }

        const task = await compile(item);

        compiled.push(task);

        // A page made of others' content takes by far the longest to render
        if ('parts' in item) {
          rendering.prepend([task]);
        } else {
          tasks.push(task);
        }
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
