import assert from 'node:assert/strict';
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

describe('web generate', () => {
  it('omits View As links for synthetic pages only', async () => {
    await setConfig({});

    const fs = createEntry('fs', 'File system');
    const notFoundPage = buildNotFoundPage();
    const contents = await Promise.all([
      buildContent([fs], fs),
      buildContent(notFoundPage.entries, notFoundPage.head),
    ]);
    const input = contents.map(toCodeItem);

    const [fsPage, notFoundResult] = await generate(input);

    assert.match(fsPage.html, /View As/);
    assert.match(fsPage.html, /href=fs\.json/);
    assert.match(fsPage.html, /href=fs\.md/);

    assert.doesNotMatch(notFoundResult.html, /View As/);
    assert.doesNotMatch(notFoundResult.html, /href=404\.json/);
    assert.doesNotMatch(notFoundResult.html, /href=404\.md/);
  });

  it('renders the configurable head without hardcoded defaults', async () => {
    // `setConfig` resolves generator defaults; mutate the live config to apply
    // per-generator overrides (the same object `getConfig('web')` returns).
    const config = await setConfig({});
    config.web.head = {
      meta: [
        { name: 'description', content: 'Custom project docs' },
        { property: 'og:image', content: 'https://example.com/og.png' },
      ],
      links: [{ rel: 'icon', href: 'https://example.com/favicon.ico' }],
      html: ['<meta name="theme-color" content="#abcdef" />'],
    };

    const fs = createEntry('fs', 'File system');
    const [fsPage] = await generate([toCodeItem(await buildContent([fs], fs))]);

    assert.match(fsPage.html, /Custom project docs/);
    assert.match(fsPage.html, /https:\/\/example\.com\/og\.png/);
    assert.match(fsPage.html, /href=https:\/\/example\.com\/favicon\.ico/);
    assert.match(fsPage.html, /content=#abcdef/);

    // Project-branding `head` config no longer leaks Node.js defaults.
    assert.doesNotMatch(fsPage.html, /nodejs\.org/);

    // Structural/theme tags stay hardcoded in the template regardless.
    assert.match(fsPage.html, /property=og:type content=website/);
    assert.match(fsPage.html, /href=https:\/\/fonts\.googleapis\.com/);
  });
});
