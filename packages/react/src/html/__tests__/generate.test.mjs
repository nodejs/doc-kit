import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { collectAsyncGenerator } from '@doc-kit/core/caching.mjs';
import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { once } from '@doc-kit/core/utils/generators.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';
import { jsx, toJs } from 'estree-util-to-js';

import buildContent from '../../jsx-ast/utils/buildContent.mjs';
import { buildNotFoundPage } from '../../jsx-ast/utils/synthetic/404.mjs';
import { createSyntheticHead } from '../../jsx-ast/utils/synthetic/synthetic.mjs';
import { generate as sectionPages } from '../../section-pages/generate.mjs';
import { compile, createViteBundler } from '../bundlers/vite.mjs';
import { FONTS } from '../constants.mjs';
import { generate as generatePages } from '../generate.mjs';
import { processChunk } from '../utils/render.mjs';

/**
 * A composed page of the given pages' content, in that order, as Node.js's
 * `html-all` generator gives `all.html`.
 *
 * @param {Array<{ data: { api: string }, headings: Array<object> }>} pages
 */
const createAllPage = pages => ({
  data: createSyntheticHead('all', 'All'),
  headings: pages.flatMap(({ headings }) => headings),
  parts: pages.map(({ data }) => data.api),
});

// With one thread, the pages arrive as one batch
const generate = pages => generatePages([pages]);

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

  return { config, output };
};

const createPage = async (api, text) => {
  const entry = createEntry(api, text);
  const page = await buildContent([entry], entry);

  return toPage(page);
};

// The Vite adapter, recording what it compiles and bundles
const createRecordingBundler = (calls, { bundled } = {}) => {
  const vite = createViteBundler();

  return {
    buildServer(options) {
      calls.push('server');

      return vite.buildServer(options);
    },

    compile(code, fileName) {
      calls.push(fileName);

      return vite.compile(code, fileName);
    },

    async buildClient(options) {
      calls.push('client');

      const assets = await vite.buildClient(options);

      bundled?.resolve();

      return assets;
    },
  };
};

const listBuildDirectories = async () => {
  const names = await readdir(tmpdir());

  return names.filter(name => name.startsWith('doc-kit-html-'));
};

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

  it("assembles a composed page from its parts' content", async context => {
    const { output } = await createTestConfiguration(context);

    const entries = [
      createEntry('zlib', 'Zlib'),
      createEntry('fs', 'File system'),
      createEntry('index', 'Index'),
    ];

    const contents = await Promise.all(
      entries.map(entry => buildContent([entry], entry))
    );

    const [zlib, fs, index] = contents.map(toPage);

    await generate([zlib, fs, index, createAllPage([fs, zlib])]);

    const html = await readFile(join(output, 'all.html'), 'utf8');

    assert.match(html, /<title>All \|/);
    // Its parts' content, in its order, and nothing else
    assert.match(html, /File system body[\s\S]*Zlib body/);
    assert.doesNotMatch(html, /Index body/);
    // Their tables of contents, concatenated
    assert.match(html, /href="#fs"[\s\S]*href="#zlib"/);
    assert.doesNotMatch(html, /View As/);
  });

  it('numbers the ids of a composed page across its parts', async context => {
    const { output } = await createTestConfiguration(context);

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

    const pages = contents.map(toPage);

    await generate([...pages, createAllPage(pages)]);

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

    const pages = Map.groupBy(
      await collectAsyncGenerator(sectionPages(once(entries))),
      entry => entry.api
    );
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
    assert.deepStrictEqual(calls, ['compile', 'server', 'client']);
  });

  describe('with the manifest', () => {
    let zlib;
    let fs;
    let index;
    let all;
    let manifest;

    before(async () => {
      await setConfig({ target: ['html'], version: 'v22.0.0', changelog: [] });

      zlib = await createPage('zlib', 'Zlib');
      fs = await createPage('fs', 'File system');
      index = await createPage('index', 'Index');
      all = createAllPage([fs, zlib]);
      manifest = [zlib, fs, index, all].map(({ data }) => data);
    });

    it(
      'bundles once the manifest arrives, and compiles each page as it arrives',
      // The input waits for the bundles
      { timeout: 10_000 },
      async context => {
        const { config } = await createTestConfiguration(context);
        const calls = [];
        const bundled = Promise.withResolvers();

        config.threads = 2;
        config.html.bundler = createRecordingBundler(calls, { bundled });

        async function* input() {
          yield [zlib];
          yield [{ manifest }];

          await bundled.promise;

          yield [fs];
          yield [index];
        }

        await generatePages(input());

        assert.deepStrictEqual(calls, [
          'zlib.jsx',
          'server',
          'client',
          'fs.jsx',
          'index.jsx',
        ]);
      }
    );

    it('builds the same site with one thread', async context => {
      const build = async (threads, input) => {
        const { config, output } = await createTestConfiguration(context);

        config.threads = threads;
        config.html.bundler = createRecordingBundler([]);

        await generatePages(input);

        return readPages(output);
      };

      async function* batches() {
        yield [zlib];
        yield [{ manifest }];
        yield [fs, all];
        yield [index];
      }

      const streamed = await build(2, batches());
      const whole = await build(1, [[zlib, fs, all, { manifest }, index]]);

      assert.deepStrictEqual(Object.keys(whole), [
        'all.html',
        'fs.html',
        'index.html',
        'zlib.html',
      ]);
      assert.deepStrictEqual(whole, streamed);
    });

    it(
      'waits for the bundles and writes nothing when its input fails',
      { timeout: 10_000 },
      async context => {
        const { config, output } = await createTestConfiguration(context);
        const before = await listBuildDirectories();
        const calls = [];

        config.threads = 2;
        config.html.bundler = createRecordingBundler(calls);

        // Fails while the bundles are being built
        async function* input() {
          yield [zlib];
          yield [{ manifest }];

          throw new Error('jsx-ast failed');
        }

        await assert.rejects(generatePages(input()), /jsx-ast failed/);

        const after = await listBuildDirectories();
        const pages = await readPages(output);

        assert.deepStrictEqual(calls, ['zlib.jsx', 'server', 'client']);
        assert.deepStrictEqual(
          after.filter(name => !before.includes(name)),
          []
        );
        assert.deepStrictEqual(pages, {});
      }
    );

    it(
      'drops the pages still waiting for a worker when its input fails',
      // The worker waits for the input to fail
      { timeout: 10_000 },
      async context => {
        const { config, output } = await createTestConfiguration(context);
        const rendering = Promise.withResolvers();
        const failed = Promise.withResolvers();

        config.threads = 2;
        config.html.bundler = createRecordingBundler([]);

        // Renders a batch at a time, the first once the input has failed
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

          await rendering.promise;

          yield [fs];

          // Once the failure has reached the generator
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
