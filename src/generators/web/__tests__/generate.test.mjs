import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '../../../utils/configuration/index.mjs';
import buildContent from '../../jsx-ast/utils/buildContent.mjs';
import { buildNotFoundPage } from '../../jsx-ast/utils/synthetic/404.mjs';
import { generate } from '../generate.mjs';

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
    const input = await Promise.all([
      buildContent([fs], fs),
      buildContent(notFoundPage.entries, notFoundPage.head),
    ]);

    const [fsPage, notFoundResult] = await generate(input);

    assert.match(fsPage.html, /View As/);
    assert.match(fsPage.html, /href=fs\.json/);
    assert.match(fsPage.html, /href=fs\.md/);

    assert.doesNotMatch(notFoundResult.html, /View As/);
    assert.doesNotMatch(notFoundResult.html, /href=404\.json/);
    assert.doesNotMatch(notFoundResult.html, /href=404\.md/);
  });
});
