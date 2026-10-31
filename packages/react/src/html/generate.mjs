'use strict';

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashDirectory } from '@doc-kit/core/incremental/index.mjs';
import logger from '@doc-kit/core/logger/index.mjs';
import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { omitKeys } from '@doc-kit/core/utils/misc.mjs';

import { resolveBundler } from './bundlers/index.mjs';
import { buildAllPage } from './utils/all.mjs';
import { copyStaticAssets } from './utils/copying.mjs';
import createProgramBuilder, { moduleFileName } from './utils/generate.mjs';
import { pageFileName } from './utils/processing.mjs';
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
export async function generate(input, worker, { incremental }) {
  const config = getConfig('html');

  const template = await readFile(config.templatePath, 'utf-8');

  // The built library and the compiled page programs live here until every
  // page is written; the directory is removed afterwards
  const outDir = await mkdtemp(join(tmpdir(), 'doc-kit-html-'));

  try {
    const { assets, tasks } = await buildPrograms({
      pages: [...input],
      outDir,
      config,
      template,
      incremental,
    });

    // The pages' programs are compiled, so rendering doesn't need their code
    input = undefined;

    await createPageWriter(worker)(tasks, { template, assets });

    await incremental.prune();
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }

  await copyStaticAssets(config);
}

/**
 * Bundles the component library and the client assets, and compiles the stale
 * pages' programs into `outDir`, for the worker pool to render.
 *
 * Everything it sets up for that, the bundler included, is let go once it
 * returns: with one thread, the pages are rendered on this thread next.
 *
 * @param {object} options
 * @param {Array<import('./types').Page>} options.pages - Every page, in render order
 * @param {string} options.outDir - Where the library and the programs are written
 * @param {import('./types').ResolvedWebConfiguration} options.config
 * @param {string} options.template
 * @param {import('@doc-kit/core/incremental/types').IncrementalSection} options.incremental
 * @returns {Promise<{ assets: import('./types').ClientAssets, tasks: Array<import('./types').PageTask> }>}
 */
const buildPrograms = async ({
  pages,
  outDir,
  config,
  template,
  incremental,
}) => {
  const all = config.generateAllPage ? buildAllPage(pages) : undefined;
  const allPages = all ? [...pages, all] : pages;

  // Every page's metadata, in render order — the sidebar, the index and the
  // cross links need the whole set.
  const datas = allPages.map(({ data }) => data);

  // Loaded here rather than with the generator, so the threads rendering
  // pages, which load this module too, never load what only this needs
  const { createVirtualImports } = await import('./utils/config.mjs');

  const bundler = await resolveBundler(config.bundler);
  const { buildLibraryProgram, buildPageProgram, clientProgram } =
    createProgramBuilder();

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

  // Everything a page depends on besides itself. The library's bytes cover
  // every component, dependency and the page set it embeds; only the library
  // is in `outDir` yet
  await incremental.salt(async () => [
    await hashDirectory(outDir),
    JSON.stringify(assets),
    template,
  ]);

  const stale = partitionPages({ pages: allPages, all, incremental });

  // A bundler not saying what it wrote only has the files every page loads
  // tracked
  const emitted = assets.emitted ?? [
    ...assets.scripts,
    ...assets.preloads,
    ...assets.stylesheets,
    ...(assets.fonts ?? []),
  ];

  incremental.record('client', ...emitted);

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

  // The composed page imports the module pages' programs, so they are compiled
  // whenever it is rendered
  const allIsStale = all !== undefined && stale.has(all);
  const parts = new Set(allIsStale ? all.parts : []);

  const toCompile = pages.filter(
    page => stale.has(page) || parts.has(page.data.api)
  );
  const tasks = [];

  for (const page of toCompile) {
    const task = await compile(page);

    if (stale.has(page)) {
      tasks.push(task);
    }
  }

  // The composed page is rendered by the worker pool alongside the others.
  // Rendering it on this thread instead would hold the whole site in it and
  // block the pool from shutting down its idle workers until it is done.
  // It goes first: it takes by far the longest, so the other pages are
  // rendered while it is.
  if (allIsStale) {
    tasks.unshift(await compile(all));
  }

  htmlLogger.debug(
    `Compiled ${toCompile.length + (allIsStale ? 1 : 0)} page programs, ` +
      `${tasks.length} to render`
  );

  return { assets, tasks };
};

/**
 * A page's metadata
 *
 * @param {import('./types').Page} page
 * @returns {string}
 */
const pageJSON = ({ data, headings, readingTime }) =>
  JSON.stringify(
    { data: omitKeys(data, ['content']), headings, readingTime },
    (key, value) =>
      key === 'position' || key === 'yamlPosition' ? undefined : value
  );

/**
 * Picks the pages to render
 *
 * @param {object} options
 * @param {Array<import('./types').Page>} options.pages
 * @param {import('./types').ComposedPage | undefined} options.all
 * @param {import('@doc-kit/core/incremental/types').IncrementalSection} options.incremental
 * @returns {Set<import('./types').Page>}
 */
const partitionPages = ({ pages, all, incremental }) => {
  const byApi = new Map(pages.map(page => [page.data.api, page]));

  /**
   * @param {import('./types').Page} page
   * @returns {Array<string>}
   */
  const keyParts = page =>
    page === all
      ? [pageJSON(all), ...all.parts.flatMap(api => keyParts(byApi.get(api)))]
      : [pageJSON(page), page.content];

  const { stale } = incremental.partition(pages, {
    key: keyParts,
    /** @param {import('./types').Page} page */
    files: page => pageFileName(page.data),
  });

  return new Set(stale);
};
