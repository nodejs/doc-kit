import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { jsx, toJs } from 'estree-util-to-js';

import buildContent from '../../jsx-ast/utils/buildContent.mjs';
import { buildNotFoundPage } from '../../jsx-ast/utils/synthetic/404.mjs';
import { generate as chunk } from '../../section-pages/generate.mjs';
import { createViteBundler } from '../bundlers/vite.mjs';
import { generate } from '../generate.mjs';

/**
 * Converts a JSX AST entry into the `{ data, code }` shape `web` now consumes,
 * mirroring the conversion the jsx-ast worker performs before streaming.
 */
const toCodeItem = content => ({
  data: content.data,
  code: toJs(content, { handlers: jsx }).value,
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

    await generate(contents.map(toCodeItem));

    const [fsHTML, notFoundHTML] = await Promise.all([
      readFile(join(output, 'api/fs.html'), 'utf8'),
      readFile(join(output, '404.html'), 'utf8'),
    ]);

    assert.match(fsHTML, /View As/);
    assert.match(fsHTML, /href=fs\.json/);
    assert.match(fsHTML, /href=fs\.md/);
    assert.doesNotMatch(notFoundHTML, /View As/);
    assert.match(fsHTML, /src=\.\.\/assets\//);
    assert.match(notFoundHTML, /src=\.\/assets\//);
    assert.match(fsHTML, /on:idle[^>]*data-island-name=SearchBox/);
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

    await generate(contents.map(toCodeItem));

    const [fsHTML, readFileHTML] = await Promise.all([
      readFile(join(output, 'fs.html'), 'utf8'),
      readFile(join(output, 'fs/readFile.html'), 'utf8'),
    ]);

    // Assets and module files resolve from the nested directory
    assert.match(readFileHTML, /src=\.\.\/assets\//);
    assert.match(readFileHTML, /href=\.\.\/fs\.json/);
    assert.match(readFileHTML, /href=\.\.\/fs\.html#fsreadfile/);

    // The sidebar nests the module's sections, repeating the module itself
    assert.match(readFileHTML, /<details[^>]*open/);
    assert.match(
      readFileHTML,
      /href=\.\.\/fs\.html[^>]*>(<[^>]*>)*File system/
    );
    assert.match(readFileHTML, /href=callback-api\.html/);

    // Previous/next step through the module's sections
    assert.match(readFileHTML, /Callback API/);
    assert.match(readFileHTML, /href=watch\.html/);
    assert.match(fsHTML, /Next/);

    // Links were re-targeted for the chunk page
    assert.match(readFileHTML, /href=watch\.html#fswatch/);
    assert.match(readFileHTML, /href=\.\.\/net\.html/);

    // The full page is untouched, and lists sections in its own sidebar
    assert.match(fsHTML, /href=fs\.json/);
    assert.match(fsHTML, /href=fs\/readFile\.html/);
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
    await generate([toCodeItem(await buildContent([fs], fs))]);
    const html = await readFile(join(output, 'fs.html'), 'utf8');

    assert.match(html, /Custom project docs/);
    assert.match(html, /https:\/\/example\.com\/og\.png/);
    assert.match(html, /href=https:\/\/example\.com\/favicon\.ico/);
    assert.match(html, /content=#abcdef/);
    assert.doesNotMatch(html, /nodejs\.org/);
    assert.match(html, /property=og:type content=website/);
  });

  it('uses Vite base URLs for absolute client assets', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.useAbsoluteURLs = true;
    config.html.baseURL = 'https://example.com/docs';

    const notFoundPage = buildNotFoundPage();
    const content = await buildContent(notFoundPage.entries, notFoundPage.head);
    await generate([toCodeItem(content)]);
    const html = await readFile(join(output, '404.html'), 'utf8');

    assert.match(html, /src=https:\/\/example\.com\/docs\/assets\//);
    assert.match(html, /href=https:\/\/example\.com\/docs\/assets\//);
  });

  it('applies configured Vite plugins', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.html.bundler = createViteBundler({
      plugins: [
        {
          name: 'test-html-transform',
          transformIndexHtml() {
            return [
              {
                tag: 'meta',
                attrs: { name: 'vite-plugin', content: 'enabled' },
                injectTo: 'head',
              },
            ];
          },
        },
      ],
    });

    const fs = createEntry('fs', 'File system');
    await generate([toCodeItem(await buildContent([fs], fs))]);
    const html = await readFile(join(output, 'fs.html'), 'utf8');

    assert.match(html, /name=vite-plugin/);
  });

  it('uses a custom bundler adapter for server and client output', async context => {
    const { config, output } = await createTestConfiguration(context);
    const calls = [];

    config.html.bundler = {
      getEntryId() {
        calls.push('entry');
        return '/custom/index.js';
      },

      async render({ entries, virtualImports, config: receivedConfig }) {
        calls.push('server');
        assert.strictEqual(receivedConfig, config.html);
        assert.ok(entries.has('fs.jsx'));
        assert.match(virtualImports['#theme/config'], /export const pages/);
        assert.match(
          virtualImports['#theme/config'],
          /export const server = true;/
        );

        return new Map([
          ['fs', '<article data-custom-ssr>Custom SSR</article>'],
        ]);
      },

      async build({ entry, virtualImports, pages, config: receivedConfig }) {
        calls.push('client');
        assert.strictEqual(receivedConfig, config.html);
        assert.match(entry, /registerIslands\(/);
        assert.match(
          virtualImports['#theme/config'],
          /export const server = false;/
        );

        await Promise.all(
          [...pages].map(async ([fileName, html]) => {
            const path = join(output, fileName);
            await mkdir(dirname(path), { recursive: true });
            await writeFile(path, html);
          })
        );
      },
    };

    const fs = createEntry('fs', 'File system');
    await generate([toCodeItem(await buildContent([fs], fs))]);
    const html = await readFile(join(output, 'fs.html'), 'utf8');

    assert.match(html, /data-custom-ssr/);
    assert.match(html, /src="\/custom\/index\.js"/);
    assert.deepStrictEqual(calls, ['server', 'entry', 'client']);
  });
});
