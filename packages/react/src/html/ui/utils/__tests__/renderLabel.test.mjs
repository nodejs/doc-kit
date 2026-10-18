import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  setConfig,
  default as getConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';

import { buildServer } from '../../../bundlers/vite.mjs';

const output = await mkdtemp(join(tmpdir(), 'doc-kit-render-label-test-'));
const renderLabelModule = await buildServer({
  entry: `export { renderLabel } from ${JSON.stringify(
    pathToFileURL(fileURLToPath(new URL('../renderLabel.jsx', import.meta.url)))
      .href
  )};`,
  virtualImports: {},
  outDir: output,
  config: await setConfig({
    target: ['html'],
    output,
    version: 'v22.0.0',
    changelog: [],
    generators: {
      html: {},
    },
  }).then(() => getConfig('html')),
});
const { renderLabel } = await import(renderLabelModule);

process.once('exit', () => rm(output, { recursive: true, force: true }));

describe('renderLabel', () => {
  it('does not render elements for empty segments', () => {
    const result = renderLabel('`value`');

    assert.equal(result.length, 3);
    assert.equal(result[0], null);
    assert.equal(result[1].type, 'code');
    assert.equal(result[2], null);
  });

  it('uses unique keys when segments have the same content', () => {
    const result = renderLabel('text `value` text `value`');
    const elements = result.filter(Boolean);
    const keys = elements.map(segment => segment.key);

    assert.deepEqual(keys, [0, 1, 2, 3]);
    assert.deepEqual(
      elements.map(segment => [segment.type, segment.props.children]),
      [
        ['span', 'text '],
        ['code', 'value'],
        ['span', ' text '],
        ['code', 'value'],
      ]
    );
  });
});
