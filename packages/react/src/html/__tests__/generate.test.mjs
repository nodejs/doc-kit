import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { collectAsyncGenerator } from '@doc-kit/core/caching.mjs';
import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';
import { jsx, toJs } from 'estree-util-to-js';

import buildContent from '../../jsx-ast/utils/buildContent.mjs';
import { buildNotFoundPage } from '../../jsx-ast/utils/synthetic/404.mjs';
import { generate as sectionPages } from '../../section-pages/generate.mjs';
import { compile, createViteBundler } from '../bundlers/vite.mjs';
import { FONTS } from '../constants.mjs';
import { generate as generatePages } from '../generate.mjs';
import { processChunk } from '../utils/render.mjs';

/**
 * Yields the given items as one batch, as a dependency streaming them does.
 *
 * @param {Array<object>} items
 */
async function* streamInOneBatch(items) {
  yield items;
}

/**
 * Runs the generator over the given pages, streamed in as one batch, as
 * `jsx-ast` yields them.
 *
 * @param {Array<object>} pages
 */
const generate = pages => generatePages(streamInOneBatch(pages));

/**
 * Runs `section-pages` over the given entries, streamed in as one batch, and
 * collects its pages.
 *
 * @param {Array<object>} entries
 */
const chunk = entries =>
  collectAsyncGenerator(sectionPages(streamInOneBatch(entries)));

// Pages are rendered with the pipeline of `jsx-ast`
await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../../jsx-ast/index.mjs'))
);

/**
 * Converts a page's JSX AST into the `{ data, headings, readingTime, content }`
 * shape `html` consumes, mirroring the conversion the jsx-ast worker performs.
 */
const toPage = ({ content, ...page }) => ({
  ...page,
  content: toJs(content, { handlers: jsx }).value,
});

const createEntry = (
  api,
  text,
  { depth = 1, slug = api, type, name = text } = {}
) => {
  const heading = {
    type: 'heading',
    depth,
    children: [{ type: 'text', value: text }],
    data: { name, text, slug, type },
  };

  return {
    api,
    path: `/${api}`,
    basename: api,
    heading,
    stability: null,
    content: {
      type: 'root',
      children: [
        heading,
        {
          type: 'paragraph',
          children: [{ type: 'text', value: `${name} body` }],
        },
      ],
    },
  };
};

const createTestConfiguration = async (context, target = ['html']) => {
  const output = await mkdtemp(join(tmpdir(), 'doc-kit-web-test-'));
  context.after(() => rm(output, { recursive: true, force: true }));

  const config = await setConfig({
    target,
    output,
    version: 'v22.0.0',
    changelog: [],
    generators: {
      html: {},
    },
  });

  // The pages under test are the module pages themselves
  config.html.generateAllPage = false;

  return { config, output };
};

/**
 * A page as `jsx-ast` emits it, its content a plain paragraph.
 *
 * @param {string} api
 * @param {string} text
 */
const createPage = (api, text) => ({
  data: createEntry(api, text),
  headings: [{ depth: 1, value: text, slug: api }],
  readingTime: undefined,
  content: `<><p>${text} body</p></>`,
});

/**
 * A stand-in for the component library: the JSX runtime, and a renderer that
 * writes the elements out as plain markup.
 */
const STAND_IN_LIBRARY = [
  'export const h = (type, props, ...children) => ({ type, props: { ...props, children } });',
  'export const Fragment = ({ children }) => children;',
  'export const Layout = ({ children }) => children;',
  'const render = node =>',
  '  Array.isArray(node) ? node.map(render).join("")',
  '  : typeof node?.type === "function" ? render(node.type(node.props))',
  '  : typeof node?.type === "string" ? `<${node.type}>${render(node.props.children)}</${node.type}>`',
  '  : String(node ?? "");',
  'export const renderToStringAsync = async node => render(node);',
].join('\n');

/**
 * A stand-in bundler: it builds the stand-in library, compiles the pages
 * with the real compiler, and has no client assets. It records each program
 * it compiles, by file name, and each bundle it builds.
 *
 * @param {Array<string>} calls
 * @param {{ bundled?: PromiseWithResolvers<void>, slow?: boolean }} [options]
 *   `bundled` is resolved once both bundles are built; `slow` makes the
 *   library take a while, as a real one does, so that a generator that didn't
 *   wait for it would remove its directory while it is being built.
 */
const createStandInBundler = (calls, { bundled, slow = false } = {}) => ({
  async buildServer({ outDir }) {
    calls.push('server');

    if (slow) {
      await setTimeout(50);
    }

    const library = join(outDir, 'library.mjs');

    await writeFile(library, STAND_IN_LIBRARY);

    return pathToFileURL(library).href;
  },

  compile(code, fileName) {
    calls.push(fileName);

    return compile(code, fileName);
  },

  async buildClient() {
    calls.push('client');
    bundled?.resolve();

    return { scripts: [], preloads: [], stylesheets: [] };
  },
});

/**
 * The temporary directories the generator builds the site in.
 */
const listBuildDirectories = async () => {
  const names = await readdir(tmpdir());

  return names.filter(name => name.startsWith('doc-kit-html-'));
};

/**
 * Every page written to the output directory, by file name.
 *
 * @param {string} output
 */
const readPages = async output => {
  const names = await readdir(output, { recursive: true });
  const pages = names.filter(name => name.endsWith('.html')).sort();
  const contents = await Promise.all(
    pages.map(name => readFile(join(output, name), 'utf8'))
  );

  return Object.fromEntries(
    pages.map((name, index) => [name, contents[index]])
  );
};

describe('web generate', () => {
  it('writes bundled HTML and omits View As links for synthetic pages', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.showSearchBox = true;
    const fs = createEntry('fs', 'File system');
    fs.path = '/api/fs';
    const notFoundPage = buildNotFoundPage();
    const contents = await Promise.all([
      buildContent([fs], fs),
      buildContent(notFoundPage.entries, notFoundPage.head),
    ]);

    await generate(contents.map(toPage));

    const [fsHTML, notFoundHTML] = await Promise.all([
      readFile(join(output, 'api/fs.html'), 'utf8'),
      readFile(join(output, '404.html'), 'utf8'),
    ]);

    assert.match(fsHTML, /View As/);
    assert.match(fsHTML, /href="fs\.json"/);
    assert.match(fsHTML, /href="fs\.md"/);
    assert.doesNotMatch(notFoundHTML, /View As/);
    // Assets resolve from the page: relative for real pages, from the root
    // for synthetic ones, which are served at any path
    assert.match(fsHTML, /src="\.\.\/assets\/client-[^"]+\.js"/);
    assert.match(fsHTML, /href="\.\.\/assets\/[^"]+\.css"/);
    assert.match(notFoundHTML, /src="\/assets\/client-[^"]+\.js"/);
    assert.match(fsHTML, /on:idle[^>]*data-island-name="SearchBox"/);
    // The manifest the asset tags were read from does not ship
    assert.equal((await readdir(output)).includes('.vite'), false);

    // Fonts are hashed like every other asset, and preloaded from where the
    // bundler actually wrote them
    const fonts = [...fsHTML.matchAll(/href="\.\.\/(assets\/[^"]+\.woff2)"/g)];
    const written = await readdir(join(output, 'assets'));

    assert.strictEqual(fonts.length, FONTS.length);

    for (const [, font] of fonts) {
      assert.match(font, /-[\w-]{8}\.woff2$/);
      assert.ok(written.includes(font.slice('assets/'.length)), font);
    }
  });

  it('assembles all.html from the module pages, in sidebar order', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.generateAllPage = true;

    const entries = [
      createEntry('zlib', 'Zlib'),
      createEntry('fs', 'File system'),
      createEntry('index', 'Index'),
    ];

    await generate(
      await Promise.all(
        entries.map(entry => buildContent([entry], entry))
      ).then(contents => contents.map(toPage))
    );

    const html = await readFile(join(output, 'all.html'), 'utf8');

    assert.match(html, /<title>All \|/);
    // Both modules' content, file system first, the index left out
    assert.match(html, /File system body[\s\S]*Zlib body/);
    assert.doesNotMatch(html, /Index body/);
    // Their tables of contents, concatenated
    assert.match(html, /href="#fs"[\s\S]*href="#zlib"/);
    assert.doesNotMatch(html, /View As/);
  });

  it('numbers the ids of all.html across its parts', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.generateAllPage = true;

    // Each module has code tabs, whose elements take ids
    const entries = ['zlib', 'fs'].map(api => {
      const entry = createEntry(api, api);

      entry.content.children.push(
        { type: 'code', lang: 'mjs', value: `import ${api};` },
        { type: 'code', lang: 'cjs', value: `require('${api}');` }
      );

      return entry;
    });

    const contents = await Promise.all(
      entries.map(entry => buildContent([entry], entry))
    );

    await generate(contents.map(toPage));

    const html = await readFile(join(output, 'all.html'), 'utf8');
    const ids = [...html.matchAll(/ id="([^"]*P0-\d+[^"]*)"/g)].map(
      ([, id]) => id
    );

    assert.ok(ids.length >= 4);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('renders chunk pages with navigation back to their module', async context => {
    const { config, output } = await createTestConfiguration(context, [
      'section-pages',
    ]);

    // `fs.readFile()` is at depth 3
    config['section-pages'].maxDepth = 3;

    const entries = [
      createEntry('fs', 'File system'),
      createEntry('fs', 'Callback API', { depth: 2, slug: 'callback-api' }),
      createEntry('fs', '`fs.readFile()`', {
        depth: 3,
        slug: 'fsreadfile',
        type: 'method',
        name: 'readFile',
      }),
      createEntry('fs', '`fs.watch()`', {
        depth: 2,
        slug: 'fswatch',
        type: 'method',
        name: 'watch',
      }),
    ];

    // A link from one section to another, and one to a sibling module
    entries[2].content.children.push({
      type: 'paragraph',
      children: [
        {
          type: 'link',
          url: '#fswatch',
          children: [{ type: 'text', value: 'n' }],
        },
        {
          type: 'link',
          url: 'net.html',
          children: [{ type: 'text', value: 'x' }],
        },
      ],
    });

    const pages = Map.groupBy(await chunk(entries), entry => entry.api);
    const contents = await Promise.all(
      [...pages.values()].map(group => buildContent(group, group[0]))
    );

    await generate(contents.map(toPage));

    const [fsHTML, readFileHTML] = await Promise.all([
      readFile(join(output, 'fs.html'), 'utf8'),
      readFile(join(output, 'fs/readFile.html'), 'utf8'),
    ]);

    // Assets and module files resolve from the nested directory
    assert.match(readFileHTML, /src="\.\.\/assets\//);
    assert.match(readFileHTML, /href="\.\.\/fs\.json"/);
    assert.match(readFileHTML, /href="\.\.\/fs\.html#fsreadfile"/);

    // The sidebar nests the module's sections, repeating the module itself
    assert.match(readFileHTML, /<details[^>]*open/);
    assert.match(
      readFileHTML,
      /href="\.\.\/fs\.html"[^>]*>(<[^>]*>)*File system/
    );
    assert.match(readFileHTML, /href="callback-api\.html"/);

    // Previous/next step through the module's sections
    assert.match(readFileHTML, /Callback API/);
    assert.match(readFileHTML, /href="watch\.html"/);
    assert.match(fsHTML, /Next/);

    // Links were re-targeted for the chunk page
    assert.match(readFileHTML, /href="watch\.html#fswatch"/);
    assert.match(readFileHTML, /href="\.\.\/net\.html"/);

    // The full page is untouched, and lists sections in its own sidebar
    assert.match(fsHTML, /href="fs\.json"/);
    assert.match(fsHTML, /href="fs\/readFile\.html"/);
  });

  it('renders the configurable head without hardcoded defaults', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.head = {
      meta: [
        { name: 'description', content: 'Custom project docs' },
        { property: 'og:image', content: 'https://example.com/og.png' },
      ],
      links: [{ rel: 'icon', href: 'https://example.com/favicon.ico' }],
      html: ['<meta name="theme-color" content="#abcdef" />'],
    };

    const fs = createEntry('fs', 'File system');
    await generate([toPage(await buildContent([fs], fs))]);
    const html = await readFile(join(output, 'fs.html'), 'utf8');

    assert.match(html, /Custom project docs/);
    assert.match(html, /https:\/\/example\.com\/og\.png/);
    assert.match(html, /href="https:\/\/example\.com\/favicon\.ico"/);
    assert.match(html, /content="#abcdef"/);
    assert.doesNotMatch(html, /nodejs\.org/);
    assert.match(html, /property="og:type" content="website"/);
  });

  it('uses the base URL for absolute client assets', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.useAbsoluteURLs = true;
    config.html.baseURL = 'https://example.com/docs';

    const notFoundPage = buildNotFoundPage();
    const content = await buildContent(notFoundPage.entries, notFoundPage.head);
    await generate([toPage(content)]);
    const html = await readFile(join(output, '404.html'), 'utf8');

    assert.match(html, /src="https:\/\/example\.com\/docs\/assets\//);
    assert.match(html, /href="https:\/\/example\.com\/docs\/assets\//);
  });

  it('applies configured Vite plugins to the client build', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.bundler = createViteBundler({
      plugins: [
        {
          name: 'test-transform',
          transform(code, id) {
            if (id.includes('client/index.jsx')) {
              return `${code}\nglobalThis.__DOC_KIT_PLUGIN__ = "enabled";`;
            }
          },
        },
      ],
    });

    const fs = createEntry('fs', 'File system');
    await generate([toPage(await buildContent([fs], fs))]);

    const assets = await readdir(join(output, 'assets'));
    const client = assets.find(file => /^client-.*\.js$/.test(file));
    const code = await readFile(join(output, 'assets', client), 'utf8');

    assert.match(code, /__DOC_KIT_PLUGIN__/);
  });

  it('uses a custom bundler adapter for server and client output', async context => {
    const { config, output } = await createTestConfiguration(context);
    const calls = [];

    config.html.bundler = {
      async buildServer({ entry, virtualImports, outDir, config: received }) {
        calls.push('server');
        assert.strictEqual(received, config.html);
        assert.match(
          entry,
          /export \{ default as Layout \} from "#theme\/Layout";/
        );
        assert.match(entry, /export \{ h, Fragment \} from "preact";/);
        assert.match(virtualImports['#theme/config'], /export const pages/);
        assert.match(
          virtualImports['#theme/config'],
          /export const server = true;/
        );

        // A stand-in library: the page renders to a fixed fragment
        const library = join(outDir, 'library.mjs');
        await writeFile(
          library,
          [
            'export const h = (type, props, ...children) => ({ type, props, children });',
            'export const Fragment = "Fragment";',
            'export const Layout = "Layout";',
            'export const renderToStringAsync = async ({ props }) =>',
            '  `<article data-custom-ssr>${props.metadata.api}:${props.headings.length}</article>`;',
          ].join('\n')
        );

        return pathToFileURL(library).href;
      },

      compile(code, fileName) {
        calls.push('compile');
        assert.match(fileName, /^fs\.jsx$/);
        assert.match(code, /export const content = \(\) => <>/);
        // The program is code only: the layout props arrive at render time
        assert.doesNotMatch(code, /"api":/);
        assert.match(code, /export default props =>/);

        return compile(code, fileName);
      },

      async buildClient({ entry, virtualImports, config: received }) {
        calls.push('client');
        assert.strictEqual(received, config.html);
        assert.match(entry, /registerIslands\(/);
        assert.match(
          virtualImports['#theme/config'],
          /export const server = false;/
        );

        return {
          scripts: ['custom/index.js'],
          preloads: ['custom/shared.js'],
          stylesheets: ['custom/index.css'],
        };
      },
    };

    const fs = createEntry('fs', 'File system');
    await generate([toPage(await buildContent([fs], fs))]);
    const html = await readFile(join(output, 'fs.html'), 'utf8');

    assert.match(html, /<article data-custom-ssr>fs:1<\/article>/);
    assert.match(
      html,
      /<script type="module" crossorigin src="\.\/custom\/index\.js">/
    );
    assert.match(html, /data-router/);
    // The adapter reported no fonts, so there are none to preload
    assert.doesNotMatch(html, /as="font"/);
    assert.match(
      html,
      /<link rel="modulepreload" crossorigin href="\.\/custom\/shared\.js" \/>/
    );
    assert.match(
      html,
      /<link rel="stylesheet" crossorigin href="\.\/custom\/index\.css" \/>/
    );
    // The page is compiled as it arrives, before the library is built
    assert.deepStrictEqual(calls, ['compile', 'server', 'client']);
  });

  describe('with the manifest', () => {
    const zlib = createPage('zlib', 'Zlib');
    const fs = createPage('fs', 'File system');
    const index = createPage('index', 'Index');
    const manifest = [zlib, fs, index].map(({ data }) => data);

    it(
      'bundles once the manifest arrives, and compiles all.html once its parts are',
      // The input waits for the bundles, so bundles that wait for the whole
      // input would never be built
      { timeout: 10_000 },
      async context => {
        const { config, output } = await createTestConfiguration(context);
        const calls = [];
        const bundled = Promise.withResolvers();

        config.threads = 2;
        config.html.generateAllPage = true;
        config.html.bundler = createStandInBundler(calls, { bundled });

        async function* input() {
          yield [zlib];
          yield [{ manifest }];

          // The bundles are built without waiting for the pages still to come
          await bundled.promise;

          yield [fs];
          yield [index];
        }

        await generatePages(input());

        // all.html is compiled once, as soon as its last part has been
        assert.deepStrictEqual(calls, [
          'zlib.jsx',
          'server',
          'client',
          'fs.jsx',
          'all.jsx',
          'index.jsx',
        ]);

        const html = await readFile(join(output, 'all.html'), 'utf8');

        // In sidebar order, the index left out
        assert.match(html, /File system body[\s\S]*Zlib body/);
        assert.doesNotMatch(html, /Index body/);
      }
    );

    it('builds the same site from its whole input, as it gets it with one thread', async context => {
      /**
       * Builds the site from the given input and reads its pages.
       *
       * @param {number} threads
       * @param {Array<object> | AsyncIterable<Array<object>>} input
       */
      const build = async (threads, input) => {
        const { config, output } = await createTestConfiguration(context);

        config.threads = threads;
        config.html.generateAllPage = true;
        config.html.bundler = createStandInBundler([]);

        await generatePages(input);

        return readPages(output);
      };

      async function* batches() {
        yield [zlib];
        yield [{ manifest }];
        yield [fs];
        yield [index];
      }

      const streamed = await build(2, batches());
      const whole = await build(1, [zlib, fs, { manifest }, index]);

      assert.deepStrictEqual(Object.keys(whole), [
        'all.html',
        'fs.html',
        'index.html',
        'zlib.html',
      ]);
      assert.deepStrictEqual(whole, streamed);
    });

    it(
      'rejects when its input fails before the manifest, leaving no temporary files',
      { timeout: 10_000 },
      async context => {
        const { config, output } = await createTestConfiguration(context);
        const before = await listBuildDirectories();

        config.threads = 2;
        config.html.bundler = createStandInBundler([]);

        async function* input() {
          yield [zlib];

          throw new Error('jsx-ast failed');
        }

        await assert.rejects(generatePages(input()), /jsx-ast failed/);

        const after = await listBuildDirectories();
        const pages = await readPages(output);

        assert.deepStrictEqual(
          after.filter(name => !before.includes(name)),
          []
        );
        assert.deepStrictEqual(pages, {});
      }
    );

    it(
      'writes no page once its input has failed after the manifest, and leaves no temporary files',
      { timeout: 10_000 },
      async context => {
        const { config, output } = await createTestConfiguration(context);
        const before = await listBuildDirectories();
        const calls = [];

        config.threads = 2;
        // Still bundling when the input fails
        config.html.bundler = createStandInBundler(calls, { slow: true });

        async function* input() {
          yield [zlib];
          yield [{ manifest }];

          throw new Error('jsx-ast failed');
        }

        await assert.rejects(generatePages(input()), /jsx-ast failed/);

        const after = await listBuildDirectories();
        const pages = await readPages(output);

        // It waited for the bundles before removing the directory they are
        // written to
        assert.deepStrictEqual(calls, ['zlib.jsx', 'server', 'client']);
        assert.deepStrictEqual(
          after.filter(name => !before.includes(name)),
          []
        );
        assert.deepStrictEqual(pages, {});
      }
    );

    it(
      'writes none of the pages still waiting for a worker once its input has failed',
      // The worker waits for the input to fail
      { timeout: 10_000 },
      async context => {
        const { config, output } = await createTestConfiguration(context);
        const rendering = Promise.withResolvers();
        const failed = Promise.withResolvers();

        config.threads = 2;
        config.html.bundler = createStandInBundler([]);

        // Renders on this thread, a batch at a time, as the generator does
        // without a pool, but the first only once the input has failed
        const worker = {
          async *stream(batches, extra) {
            for await (const tasks of batches) {
              rendering.resolve();

              await failed.promise;

              const written = await processChunk(
                tasks,
                [...tasks.keys()],
                extra
              );

              yield written;
            }
          },
        };

        async function* input() {
          yield [zlib];
          yield [{ manifest }];

          // While the zlib page is being rendered, so this one waits for it
          await rendering.promise;

          yield [fs];

          // The failure reaches the generator within this turn of the event
          // loop
          setImmediate(failed.resolve);

          throw new Error('jsx-ast failed');
        }

        await assert.rejects(generatePages(input(), worker), /jsx-ast failed/);

        const pages = await readPages(output);

        assert.deepStrictEqual(Object.keys(pages), ['zlib.html']);
      }
    );
  });
});
