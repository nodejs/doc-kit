import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import {
  createIncrementalStore,
  DISABLED_SECTION,
} from '@doc-kit/core/incremental/index.mjs';
import { loadManifest } from '@doc-kit/core/incremental/manifest.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';
import { jsx, toJs } from 'estree-util-to-js';

import buildContent from '../../jsx-ast/utils/buildContent.mjs';
import { buildNotFoundPage } from '../../jsx-ast/utils/synthetic/404.mjs';
import { generate as chunk } from '../../section-pages/generate.mjs';
import { compile, createViteBundler } from '../bundlers/vite.mjs';
import { FONTS } from '../constants.mjs';
import { generate } from '../generate.mjs';
import html from '../index.mjs';
import { pageFileName } from '../utils/processing.mjs';
import { processChunk } from '../utils/render.mjs';

// Pages are rendered with the pipeline of `jsx-ast`
await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../../jsx-ast/index.mjs'))
);

/**
 * Generates the site on this thread, as the orchestrator does without the
 * incremental option.
 */
const generateSite = pages =>
  generate(pages, undefined, { incremental: DISABLED_SECTION });

/**
 * Builds the pages of module entries, one page per module.
 */
const buildPages = async entries =>
  Promise.all(entries.map(entry => buildContent([entry], entry))).then(
    contents => contents.map(toPage)
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

    await generateSite(contents.map(toPage));

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

    await generateSite(await buildPages(entries));

    const html = await readFile(join(output, 'all.html'), 'utf8');

    assert.match(html, /<title>All \|/);
    // Both modules' content, file system first, the index left out
    assert.match(html, /File system body[\s\S]*Zlib body/);
    assert.doesNotMatch(html, /Index body/);
    // Their tables of contents, concatenated
    assert.match(html, /href="#fs"[\s\S]*href="#zlib"/);
    assert.doesNotMatch(html, /View As/);
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

    await generateSite(contents.map(toPage));

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
    await generateSite([toPage(await buildContent([fs], fs))]);
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
    await generateSite([toPage(content)]);
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
    await generateSite([toPage(await buildContent([fs], fs))]);

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
    await generateSite([toPage(await buildContent([fs], fs))]);
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
    assert.deepStrictEqual(calls, ['server', 'client', 'compile']);
  });

  describe('incremental', () => {
    /**
     * Runs an incremental build of the pages into the output, through a
     * worker that renders on this thread and notes which pages it rendered.
     *
     * @returns {Promise<{ rendered: Array<string>, manifest: import('@doc-kit/core/incremental/types').Manifest }>}
     */
    const build = async (pages, output) => {
      const rendered = [];

      const worker = {
        async *stream(tasks, extra) {
          rendered.push(...tasks.map(task => pageFileName(task.data)));

          yield await processChunk(tasks, [...tasks.keys()], extra);
        },
      };

      const store = createIncrementalStore({ enabled: true });
      const incremental = await store.section(html, { output });

      await generate(pages, worker, { incremental });
      await store.save();

      // Let the clock move, so an unchanged mtime means no write happened
      await setTimeout(20);

      return { rendered, manifest: (await loadManifest(output)).manifest };
    };

    /**
     * The modification times of the given files, by file.
     */
    const mtimes = async (output, files) =>
      Object.fromEntries(
        await Promise.all(
          files.map(async file => [
            file,
            (await stat(join(output, file))).mtimeMs,
          ])
        )
      );

    it('renders nothing the second time and leaves every file alone', async context => {
      const { config, output } = await createTestConfiguration(context);
      config.html.generateAllPage = true;

      const pages = await buildPages([
        createEntry('fs', 'File system'),
        createEntry('zlib', 'Zlib'),
      ]);

      const first = await build(pages, output);

      assert.deepEqual(first.rendered.toSorted(), [
        'all.html',
        'fs.html',
        'zlib.html',
      ]);

      const files = Object.values(
        first.manifest.generators.html.outputs
      ).flat();
      const pageFiles = files.filter(file => !file.startsWith('assets/'));
      const before = await mtimes(output, pageFiles);

      const second = await build(pages, output);

      // The client is bundled again (into the same files); the pages are not
      assert.deepEqual(second.rendered, []);
      assert.deepEqual(await mtimes(output, pageFiles), before);

      // Building the same library twice gives the same bytes: the salt holds
      assert.deepEqual(second.manifest, first.manifest);

      // The pages and the client's files are all recorded
      assert.ok(files.includes('fs.html'));
      assert.ok(files.some(file => file.startsWith('assets/')));
    });

    it('renders an edited page again, and all.html with it, but nothing else', async context => {
      const { config, output } = await createTestConfiguration(context);
      config.html.generateAllPage = true;

      const fs = createEntry('fs', 'File system');
      const zlib = createEntry('zlib', 'Zlib');

      await build(await buildPages([fs, zlib]), output);
      const before = await mtimes(output, ['fs.html', 'zlib.html', 'all.html']);

      // A change after the first paragraph: the description every page's
      // documentation index shows stays the same, so the library does too
      zlib.content.children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: 'More about zlib' }],
      });

      const { rendered } = await build(await buildPages([fs, zlib]), output);
      const after = await mtimes(output, ['fs.html', 'zlib.html', 'all.html']);

      assert.deepEqual(rendered, ['all.html', 'zlib.html']);
      assert.equal(after['fs.html'], before['fs.html']);
      assert.notEqual(after['zlib.html'], before['zlib.html']);
      assert.notEqual(after['all.html'], before['all.html']);
      assert.match(
        await readFile(join(output, 'all.html'), 'utf8'),
        /More about zlib/
      );
    });

    it('renders every page again when the page set changes', async context => {
      const { config, output } = await createTestConfiguration(context);
      config.html.generateAllPage = false;

      const fs = createEntry('fs', 'File system');
      const zlib = createEntry('zlib', 'Zlib');

      await build(await buildPages([fs, zlib]), output);

      // A new module is on every page's sidebar
      const { rendered } = await build(
        await buildPages([fs, zlib, createEntry('net', 'Net')]),
        output
      );

      assert.deepEqual(rendered.toSorted(), [
        'fs.html',
        'net.html',
        'zlib.html',
      ]);
    });

    it('removes the pages of a dropped module, and nothing else', async context => {
      const { config, output } = await createTestConfiguration(context, [
        'section-pages',
      ]);
      config.html.generateAllPage = false;
      config['section-pages'].maxDepth = 2;

      const fs = [
        createEntry('fs', 'File system'),
        createEntry('fs', '`fs.readFile()`', {
          depth: 2,
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
      const zlib = createEntry('zlib', 'Zlib');

      const toPages = async entries => {
        const groups = Map.groupBy(await chunk(entries), entry => entry.api);

        return Promise.all(
          [...groups.values()].map(group => buildContent(group, group[0]))
        ).then(contents => contents.map(toPage));
      };

      await build(await toPages([...fs, zlib]), output);

      assert.ok(existsSync(join(output, 'fs/readFile.html')));
      await writeFile(join(output, 'mine.txt'), 'not doc-kit’s');

      const { rendered, manifest } = await build(await toPages([zlib]), output);

      // The sidebar lost a module, so the remaining page is rendered again
      assert.deepEqual(rendered, ['zlib.html']);
      assert.equal(existsSync(join(output, 'fs.html')), false);
      assert.equal(existsSync(join(output, 'fs')), false);
      assert.ok(existsSync(join(output, 'zlib.html')));
      assert.ok(existsSync(join(output, 'mine.txt')));
      assert.deepEqual(
        Object.values(manifest.generators.html.outputs)
          .flat()
          .filter(file => !file.startsWith('assets/')),
        ['zlib.html']
      );
    });

    it('removes the client files a previous build wrote and this one did not', async context => {
      const { config, output } = await createTestConfiguration(context);
      config.html.generateAllPage = false;

      const pages = await buildPages([createEntry('fs', 'File system')]);

      await build(pages, output);

      const stylesheets = async () =>
        (await readdir(join(output, 'assets'))).filter(file =>
          file.endsWith('.css')
        );

      const [before] = await stylesheets();

      const stylesheet = join(output, '..', `doc-kit-test-${Date.now()}.css`);
      context.after(() => rm(stylesheet, { force: true }));
      await writeFile(stylesheet, '.extra { color: red }');
      config.html.stylesheets = [stylesheet];

      const { rendered } = await build(pages, output);

      // The assets changed, so the page did, and the old stylesheet is gone
      assert.deepEqual(rendered, ['fs.html']);
      const after = await stylesheets();
      assert.equal(after.length, 1);
      assert.notEqual(after[0], before);
    });
  });
});
