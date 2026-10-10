'use strict';

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';

import buildContent from '../buildContent.mjs';

// The content is rendered with the pipeline of `legacy-html`
await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../../index.mjs'))
);

const createEntry = slug => {
  const text = 'DEP0001: deprecated API';
  const heading = {
    type: 'heading',
    depth: 3,
    children: [{ type: 'text', value: text }],
    data: { name: text, text, slug },
  };

  return {
    api: 'deprecations',
    path: '/deprecations',
    basename: 'deprecations',
    heading,
    content: { type: 'root', children: [heading] },
  };
};

describe('buildContent', () => {
  before(() => setConfig({}));

  it('does not duplicate a legacy anchor matching the primary slug', () => {
    const output = buildContent([], [createEntry('DEP0001')]);

    assert.strictEqual((output.match(/id="DEP0001"/g) ?? []).length, 1);
  });

  it('preserves a legacy anchor that differs from the primary slug', () => {
    const output = buildContent([], [createEntry('dep0001-deprecated-api')]);

    assert.match(output, /id="DEP0001"/);
    assert.match(output, /id="dep0001-deprecated-api"/);
  });
});
