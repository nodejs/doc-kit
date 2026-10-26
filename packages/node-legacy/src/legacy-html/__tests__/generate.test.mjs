import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';

import { processChunk } from '../generate.mjs';

await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../index.mjs'))
);

const createEntry = (api, name) => {
  const heading = {
    type: 'heading',
    depth: 1,
    children: [{ type: 'text', value: name }],
    data: { name, text: name, slug: api, type: 'module' },
  };

  return {
    api,
    path: `/${api}`,
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

describe('legacy-html processChunk', () => {
  it('does not change its input on the main thread', async () => {
    await setConfig({ target: ['legacy-html'] });

    const fs = createEntry('fs', 'File system');
    const before = structuredClone(fs);

    const [page] = await processChunk(
      [{ head: fs, nodes: [fs], headNodes: [fs] }],
      [0],
      '<a class="nav-fs" href="fs.html">File system</a>'
    );

    assert.match(page.content, /File system body/);
    assert.deepEqual(fs, before);
  });
});
