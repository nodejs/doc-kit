import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { it } from 'node:test';

import { setConfig } from '#utils/configuration/index.mjs';

import { generate } from '../generate.mjs';

it('submits JavaScript files in sorted path order', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ast-js-order-'));

  try {
    for (const name of ['z.js', 'a.js', 'm.js', 'ignore.md']) {
      await writeFile(join(dir, name), '');
    }

    const input = join(dir, '*').split(sep).join('/');
    await setConfig({ target: ['ast-js'], input: [input] });

    let received;
    const worker = {
      async *stream(items) {
        received = items;
        yield [];
      },
    };

    for await (const chunk of generate(undefined, worker)) {
      assert.deepStrictEqual(chunk, []);
    }

    assert.deepStrictEqual(
      received,
      ['a.js', 'm.js', 'z.js'].map(name =>
        join(dir, name).split(sep).join('/')
      )
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
