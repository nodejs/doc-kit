import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

import { compile } from '../../bundlers/vite.mjs';
import createProgramBuilder, { moduleFileName } from '../generate.mjs';

describe('buildPageProgram', () => {
  it('imports no component into a composed page, whatever the components are named', async context => {
    const config = await setConfig({
      target: ['html'],
      version: 'v22.0.0',
      changelog: [],
      generators: { html: {} },
    });

    // Named like the composed page's own wrapper
    config.html.components = { ComposedPart: '/components/ComposedPart.jsx' };

    const dir = await mkdtemp(join(tmpdir(), 'doc-kit-program-test-'));
    context.after(() => rm(dir, { recursive: true, force: true }));

    // A stand-in for the built library, which exports every component, and
    // the part the page is made of
    const library = join(dir, 'library.mjs');

    await writeFile(
      library,
      [
        'export const h = (type, props, ...children) => ({ type, props, children });',
        'export const Fragment = "Fragment";',
        'export const Layout = "Layout";',
        'export const renderToStringAsync = async () => "";',
        'export const ComposedPart = () => null;',
      ].join('\n')
    );

    await writeFile(
      join(dir, moduleFileName('fs')),
      'export const content = () => "File system";'
    );

    const { buildPageProgram } = createProgramBuilder();
    const libraryURL = pathToFileURL(library).href;
    const program = buildPageProgram(
      { data: { api: 'all' }, headings: [], parts: ['fs'] },
      libraryURL
    );

    const imports = program
      .split('\n')
      .find(line => line.includes(JSON.stringify(libraryURL)));

    assert.doesNotMatch(imports, /ComposedPart/);

    const file = join(dir, moduleFileName('all'));
    const code = await compile(program, 'all.jsx');

    await writeFile(file, code);

    const { content } = await import(pathToFileURL(file).href);

    assert.equal(typeof content, 'function');
  });
});
