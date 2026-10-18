import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';
import { u } from 'unist-builder';

import { generate } from '../generate.mjs';

const config = await setConfig({ target: ['llms-txt-full'] });

// Pages are serialised with the pipeline of `llms-txt-full`
await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../index.mjs'))
);

const entry = (path, text) => ({
  path,
  content: u('root', [u('paragraph', [u('text', text)])]),
});

describe('llms-txt-full', () => {
  it('precedes the Markdown of every page with its URL', async () => {
    config['llms-txt-full'].baseURL = 'https://example.com';
    config['llms-txt-full'].output = undefined;

    const full = await generate([entry('/a', 'First.'), entry('/b', 'Other.')]);

    assert.equal(
      full,
      '---\nurl: https://example.com/a.md\n---\nFirst.\n\n' +
        '---\nurl: https://example.com/b.md\n---\nOther.\n'
    );
  });
});
