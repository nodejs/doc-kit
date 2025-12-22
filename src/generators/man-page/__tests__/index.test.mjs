import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import manpage from '../index.mjs';

const textNode = txt => u('text', txt);

const createMock = ({
  api = 'cli',
  slug = '',
  depth = 2,
  headingText = '',
  desc = '',
} = {}) => ({
  api,
  slug,
  heading: { depth, data: { text: headingText } },
  // eslint-disable-next-line no-sparse-arrays
  content: u('root', [, u('paragraph', [textNode(desc)])]),
});

describe('generators/man-page', () => {
  it('throws when no cli documentation present', async () => {
    await assert.rejects(
      async () => {
        await manpage.generate([{ api: 'not-cli' }], {});
      },
      { message: /Could not find any `cli` documentation/ }
    );
  });

  it('generates mandoc including options and environment entries', async () => {
    const components = [
      createMock({ api: 'cli', slug: 'cli', depth: 1 }),
      createMock({ api: 'cli', slug: 'options', depth: 2 }),
      createMock({
        api: 'cli',
        slug: 'opt-a',
        depth: 3,
        headingText: '`-a`, `--all`',
        desc: 'Option A description',
      }),
      createMock({ api: 'cli', slug: 'environment-variables-1', depth: 2 }),
      createMock({
        api: 'cli',
        slug: 'env-foo',
        depth: 3,
        headingText: '`FOO=bar`',
        desc: 'Env FOO description',
      }),
      createMock({ api: 'cli', slug: 'after', depth: 2 }),
    ];

    const result = await manpage.generate(components, {});

    // Ensure mandoc markers for options and environment variables are present
    assert.match(result, /\.It Fl/);
    assert.match(result, /Option A description/);
    assert.match(result, /\.It Ev/);
    assert.match(result, /Env FOO description/);
  });

  it('writes node.1 to output when provided', async () => {
    const components = [
      createMock({ api: 'cli', slug: 'options', depth: 2 }),
      createMock({
        api: 'cli',
        slug: 'opt-a',
        depth: 3,
        headingText: '`-a`',
        desc: 'desc',
      }),
      createMock({ api: 'cli', slug: 'environment-variables-1', depth: 2 }),
      createMock({
        api: 'cli',
        slug: 'env',
        depth: 3,
        headingText: '`X=`',
        desc: 'env desc',
      }),
      createMock({ api: 'cli', slug: 'end', depth: 2 }),
    ];

    const tmp = await mkdtemp(join(tmpdir(), 'doc-kit-'));

    const returned = await manpage.generate(components, { output: tmp });

    const file = await readFile(join(tmp, 'node.1'), 'utf-8');

    assert.equal(returned, file);
    assert.match(file, /desc/);
    assert.match(file, /env desc/);
  });
});
