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
  it('treats a missing manifest as empty, saying so', async context => {
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
    assert.match(reason, /not valid JSON/);
  });

  it('treats another schema as empty', async context => {
    const output = await createOutput(context);
    await writeManifest(output, JSON.stringify({ schema: 0, generators: {} }));

    const { manifest, reason } = await loadManifest(output);

    assert.deepEqual(manifest.generators, {});
    assert.match(reason, /schema 0/);
  });

  it('reads back what was saved, with no temporary file left', async context => {
    const output = await createOutput(context);
    const saved = {
      schema: SCHEMA,
      generators: {
        html: { outputs: { k: ['a.html'] } },
      },
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
