import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { jsx, toJs } from 'estree-util-to-js';

import { setConfig } from '../../../utils/configuration/index.mjs';
import buildContent from '../../jsx-ast/utils/buildContent.mjs';
import { buildNotFoundPage } from '../../jsx-ast/utils/synthetic/404.mjs';
import { generate } from '../generate.mjs';

/**
 * Converts a JSX AST entry into the `{ data, code }` shape `web` now consumes,
 * mirroring the conversion the jsx-ast worker performs before streaming.
 */
const toCodeItem = content => ({
  data: content.data,
  code: toJs(content, { handlers: jsx }).value,
});

const createEntry = (api, name) => {
  const heading = {
    type: 'heading',
    depth: 1,
    children: [{ type: 'text', value: name }],
    data: { name, text: name, slug: api },
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

const createTestConfiguration = async context => {
  const output = await mkdtemp(join(tmpdir(), 'doc-kit-web-test-'));
  context.after(() => rm(output, { recursive: true, force: true }));

  const config = await setConfig({
    output,
    version: 'v22.0.0',
    changelog: [],
    generators: {
      web: {},
    },
  });

  return { config, output };
};

describe('web generate', () => {
  it('writes Vite HTML entries and omits View As links for synthetic pages', async context => {
    const { output } = await createTestConfiguration(context);
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
  });

  it('renders the configurable head without hardcoded defaults', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.web.head = {
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
    config.web.useAbsoluteURLs = true;
    config.web.baseURL = 'https://example.com/docs';

    const notFoundPage = buildNotFoundPage();
    const content = await buildContent(notFoundPage.entries, notFoundPage.head);
    await generate([toCodeItem(content)]);
    const html = await readFile(join(output, '404.html'), 'utf8');

    assert.match(html, /src=https:\/\/example\.com\/docs\/assets\//);
    assert.match(html, /href=https:\/\/example\.com\/docs\/assets\//);
  });

  it('applies configured Vite plugins', async context => {
    const { config, output } = await createTestConfiguration(context);
    config.web.vite = {
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
    };

    const fs = createEntry('fs', 'File system');
    await generate([toCodeItem(await buildContent([fs], fs))]);
    const html = await readFile(join(output, 'fs.html'), 'utf8');

    assert.match(html, /name=vite-plugin/);
  });
});
