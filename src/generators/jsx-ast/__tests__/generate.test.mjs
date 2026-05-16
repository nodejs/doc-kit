import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import getConfig, { setConfig } from '../../../utils/configuration/index.mjs';
import { generate, processChunk } from '../generate.mjs';

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
  it('does not attach raw section entries to regular JSX content', async () => {
    await setConfig({});

    const fs = createEntry('fs', 'File system');
    const [content] = await processChunk([{ head: fs, entries: [fs] }], [0]);

    assert.equal(content.data.api, 'fs');
    assert.equal('sectionEntries' in content, false);
  });

  it('omits the core index entry and appends enabled synthetic pages', async () => {
    await setConfig({});

    const seenItems = [];
    const results = await collect(
      generate(
        [createEntry('index', 'Index'), createEntry('fs', 'File system')],
        createWorker(seenItems)
      )
    );

    assert.deepEqual(
      seenItems.map(({ head }) => head.api),
      ['fs']
    );
    assert.deepEqual(
      results.map(({ data }) => data.api),
      ['fs', 'all', 'index', '404']
    );

    for (const entry of results.slice(1)) {
      assert.equal(entry.data.synthetic, true);
      assert.equal(entry.data.hideViewAs, true);
    }
  });

  it('respects jsx-ast synthetic page flags', async () => {
    await setConfig({});

    const jsxAstConfig = getConfig('jsx-ast');
    jsxAstConfig.generateAllPage = false;
    jsxAstConfig.generateIndexPage = false;
    jsxAstConfig.generateNotFoundPage = false;

    const seenItems = [];
    const results = await collect(
      generate(
        [createEntry('index', 'Index'), createEntry('fs', 'File system')],
        createWorker(seenItems)
      )
    );

    assert.deepEqual(
      seenItems.map(({ head }) => head.api),
      ['fs']
    );
    assert.deepEqual(
      results.map(({ data }) => data.api),
      ['fs']
    );
  });
});
