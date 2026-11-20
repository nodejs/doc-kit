import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

import createProgramBuilder from '../generate.mjs';

describe('buildPageProgram', () => {
  it('imports no component into a composed page, whatever the components are named', async () => {
    const config = await setConfig({
      target: ['html'],
      version: 'v22.0.0',
      changelog: [],
      generators: { html: {} },
    });

    // Named like the composed page's own wrapper
    config.html.components = { ComposedPart: '/components/ComposedPart.jsx' };

    const { buildPageProgram } = createProgramBuilder();
    const libraryURL = 'file:///library.mjs';
    const program = buildPageProgram(
      { data: { api: 'all' }, headings: [], parts: ['fs'] },
      libraryURL
    );

    const imports = program
      .split('\n')
      .find(line => line.includes(JSON.stringify(libraryURL)));

    assert.doesNotMatch(imports, /ComposedPart/);
  });
});
