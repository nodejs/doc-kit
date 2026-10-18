import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import getConfig, {
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';

import { generate, processChunk } from '../generate.mjs';

// Pages are rendered with the pipeline of `jsx-ast`
await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../index.mjs'))
);

const createEntry = (api, name, { stabilityIndex = '2' } = {}) => {
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
    stability:
      stabilityIndex == null
        ? null
        : {
            data: {
              index: stabilityIndex,
              description: `${name} stable. Longer description.`,
            },
          },
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

const collect = async generator => {
  const results = [];

  for await (const chunk of generator) {
    results.push(...chunk);
  }

  return results;
};

const createWorker = seenItems => ({
  async *stream(items) {
    seenItems.push(...items);
    yield items.map(({ head }) => ({ type: 'JSXElement', data: head }));
  },
});

describe('jsx-ast generate', () => {
  it('returns the page content as a JSX fragment alongside its ToC', async () => {
    await setConfig({ target: ['jsx-ast'] });

    const fs = createEntry('fs', 'File system');
    const [page] = await processChunk([{ head: fs, entries: [fs] }], [0]);

    assert.equal(page.data.api, 'fs');
    assert.equal('sectionEntries' in page, false);
    // The layout is the html generator's: only the content is serialized
    assert.match(page.content, /^<>/);
    assert.doesNotMatch(page.content, /<Layout/);
    assert.match(page.content, /File system body/);
    assert.deepEqual(
      page.headings.map(({ value }) => value),
      ['File system']
    );
    assert.equal(page.readingTime, undefined);
  });

  it('respects jsx-ast synthetic page flags', async () => {
    await setConfig({ target: ['jsx-ast'] });

    getConfig('jsx-ast').generateNotFoundPage = false;

    const seenItems = [];
    const results = await collect(
      generate(
        [createEntry('index', 'Index'), createEntry('fs', 'File system')],
        createWorker(seenItems)
      )
    );

    assert.deepEqual(
      seenItems.map(({ head }) => head.api),
      ['index', 'fs']
    );
    assert.deepEqual(
      results.map(({ data }) => data.api),
      ['index', 'fs']
    );
  });
});
