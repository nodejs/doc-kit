'use strict';

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { writeFile } from '#utils/file.mjs';

import { SCHEMA } from '../constants.mjs';
import { createIncrementalStore, DISABLED_SECTION } from '../index.mjs';
import { loadManifest, manifestPath, saveManifest } from '../manifest.mjs';

const createOutput = async context => {
  const output = await mkdtemp(join(tmpdir(), 'doc-kit-incremental-'));
  context.after(() => rm(output, { recursive: true, force: true }));

  return output;
};

const html = { name: 'html' };

/**
 * A section of a fresh store over the output, and the store to save it with.
 */
const open = async (output, config = {}) => {
  const store = createIncrementalStore({ enabled: true });

  return { store, section: await store.section(html, { output, ...config }) };
};

const files = item => `${item.id}.html`;

/**
 * Writes the items' files.
 */
const make = async (output, items) => {
  for (const item of items) {
    await writeFile(join(output, files(item)), item.id);
  }
};

describe('createIncrementalStore', () => {
  it('hands out the no-op section when disabled or without an output', async context => {
    const output = await createOutput(context);
    const disabled = createIncrementalStore({ enabled: false });

    assert.equal(await disabled.section(html, { output }), DISABLED_SECTION);
    assert.equal(
      await createIncrementalStore({ enabled: true }).section(html, {}),
      DISABLED_SECTION
    );

    await disabled.save();
    assert.equal(existsSync(manifestPath(output)), false);
  });

  it('partitions items by whether their key made files that are still there', async context => {
    const output = await createOutput(context);
    const a = { id: 'a' };
    const b = { id: 'b' };

    const first = await open(output);

    assert.deepEqual(first.section.partition([a, b], { files }).stale, [a, b]);
    await make(output, [a]);
    await first.store.save();

    const { outputs } = (await loadManifest(output)).manifest.generators.html;

    // `b`'s file was recorded but never written, so it is not fresh
    assert.deepEqual(Object.values(outputs).toSorted(), [
      ['a.html'],
      ['b.html'],
    ]);
    assert.match(Object.keys(outputs)[0], /^[0-9a-f]{32}$/);

    const second = await open(output);

    assert.deepEqual(second.section.partition([{ id: 'a' }, b]), {
      fresh: [{ id: 'a' }],
      stale: [b],
    });

    // The same item keyed differently, or with its file gone, is stale
    const third = await open(output);

    assert.deepEqual(
      third.section.partition([a], { key: () => 'other' }).stale,
      [a]
    );
    await rm(join(output, 'a.html'));
    assert.deepEqual((await open(output)).section.partition([a]).stale, [a]);
  });

  it('salts the keys with the configuration minus the omitted keys, the declared parts and the computed ones', async context => {
    const output = await createOutput(context);
    const a = { id: 'a' };

    const first = await open(output, { title: 'A', input: 'x' });
    await first.section.salt(() => ['run']);
    first.section.partition([a], { files });
    await make(output, [a]);
    await first.store.save();

    const same = await open(output, { title: 'A', input: 'y' });
    await same.section.salt(() => ['run']);
    assert.deepEqual(same.section.partition([a]).fresh, [a]);

    const otherConfig = await open(output, { title: 'B', input: 'x' });
    await otherConfig.section.salt(() => ['run']);
    assert.deepEqual(otherConfig.section.partition([a]).stale, [a]);

    const otherRun = await open(output, { title: 'A', input: 'x' });
    await otherRun.section.salt(() => ['other']);
    assert.deepEqual(otherRun.section.partition([a]).stale, [a]);

    await assert.rejects(otherRun.section.salt(), /salted after/);
    await DISABLED_SECTION.salt(() => assert.fail('computed'));
  });

  it('prunes the files the previous build recorded and this one did not', async context => {
    const output = await createOutput(context);

    for (const file of ['kept.html', 'stale.html', 'api/fs/old.html']) {
      await writeFile(join(output, file), file);
    }

    await writeFile(join(output, 'mine.txt'), 'not doc-kit’s');

    await saveManifest(output, {
      schema: SCHEMA,
      generators: {
        html: {
          outputs: {
            k: ['kept.html', 'stale.html'],
            o: ['api/fs/old.html', 'missing.html'],
          },
        },
      },
    });

    const { store, section } = await open(output);

    section.record('label', 'kept.html');
    await section.prune();

    assert.equal(existsSync(join(output, 'kept.html')), true);
    assert.equal(existsSync(join(output, 'mine.txt')), true);
    assert.equal(existsSync(join(output, 'stale.html')), false);
    // The directory the removal emptied went too
    assert.equal(existsSync(join(output, 'api')), false);

    await store.save();

    assert.deepEqual(
      Object.values(
        (await loadManifest(output)).manifest.generators.html.outputs
      ),
      [['kept.html']]
    );
  });

  it('carries over the sections of generators not in the run, one manifest per output', async context => {
    const output = await createOutput(context);
    const other = await createOutput(context);

    await saveManifest(output, {
      schema: SCHEMA,
      generators: {
        json: { outputs: { j: ['a.json'] } },
        html: { outputs: { h: ['a.html'] } },
      },
    });

    const store = createIncrementalStore({ enabled: true });

    (await store.section(html, { output })).record('x', 'b.html');
    (await store.section({ name: 'sitemap' }, { output })).record('x', 's.xml');
    (await store.section(html, { output: other })).record('x', 'c.html');

    assert.equal(
      await store.section(html, { output }),
      await store.section(html, { output })
    );

    await store.save();

    const { generators } = (await loadManifest(output)).manifest;

    assert.deepEqual(generators.json, { outputs: { j: ['a.json'] } });
    assert.deepEqual(Object.values(generators.html.outputs), [['b.html']]);
    assert.deepEqual(Object.values(generators.sitemap.outputs), [['s.xml']]);
    assert.deepEqual(
      Object.values(
        (await loadManifest(other)).manifest.generators.html.outputs
      ),
      [['c.html']]
    );
    assert.deepEqual(await readdir(join(output, '.doc-kit')), [
      'manifest.json',
    ]);
  });
});
