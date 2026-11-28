'use strict';

import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { writeFile } from '#utils/file.mjs';

import { SCHEMA } from '../constants.mjs';
import { loadManifest, manifestPath, saveManifest } from '../manifest.mjs';

const createOutput = async context => {
  const output = await mkdtemp(join(tmpdir(), 'doc-kit-manifest-'));
  context.after(() => rm(output, { recursive: true, force: true }));

  return output;
};

const writeManifest = (output, content) =>
  writeFile(manifestPath(output), content);

describe('loadManifest', () => {
  it('treats a missing manifest as empty, with a reason', async context => {
    const output = await createOutput(context);
    const { manifest, reason } = await loadManifest(output);

    assert.deepEqual(manifest, { schema: SCHEMA, generators: {} });
    assert.match(reason, /no manifest/);
  });

  it('treats invalid JSON as empty', async context => {
    const output = await createOutput(context);
    await writeManifest(output, '{ not json');

    const { manifest, reason } = await loadManifest(output);

    assert.deepEqual(manifest.generators, {});
    assert.match(reason, /cannot be read/);
  });

  it('treats a manifest listing files outside the output as empty', async context => {
    const output = await createOutput(context);

    for (const outputs of [
      { k: ['../outside.html'] },
      { k: [join(tmpdir(), 'absolute.html')] },
      { k: ['.'] },
      { k: 'a.html' },
      ['a.html'],
    ]) {
      await writeManifest(
        output,
        JSON.stringify({ schema: SCHEMA, generators: { html: outputs } })
      );

      const { manifest, reason } = await loadManifest(output);

      assert.deepEqual(manifest.generators, {});
      assert.match(reason, /malformed/);
    }
  });

  it('keeps the files, not the keys, of an interrupted build', async context => {
    const output = await createOutput(context);

    await saveManifest(output, {
      schema: SCHEMA,
      building: true,
      generators: { html: { k: ['a.html'], o: ['b.html'] } },
    });

    const { manifest, reason } = await loadManifest(output);

    assert.deepEqual(manifest.generators, {
      html: { '': ['a.html', 'b.html'] },
    });
    assert.match(reason, /did not finish/);
  });

  it('treats another schema as empty', async context => {
    const output = await createOutput(context);
    await writeManifest(output, JSON.stringify({ schema: 0, generators: {} }));

    const { manifest, reason } = await loadManifest(output);

    assert.deepEqual(manifest.generators, {});
    assert.match(reason, /schema 0/);
  });

  it('reads back what was saved, leaving no temporary file', async context => {
    const output = await createOutput(context);
    const saved = {
      schema: SCHEMA,
      generators: { html: { k: ['a.html'] } },
    };

    await saveManifest(output, saved);

    const { manifest, reason } = await loadManifest(output);

    assert.equal(reason, undefined);
    assert.deepEqual(manifest, saved);
    assert.deepEqual(await readdir(dirname(manifestPath(output))), [
      'manifest.json',
    ]);
  });
});
