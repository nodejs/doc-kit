'use strict';

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readJSON, writeFile, writeJSON } from '#utils/file.mjs';

import { SCHEMA, STATE_DIRECTORY } from '../constants.mjs';
import { createIncrementalStore } from '../index.mjs';
import { loadManifest, manifestPath, saveManifest } from '../manifest.mjs';
import { DISABLED_SECTION } from '../section.mjs';

const createOutput = async context => {
  const output = await mkdtemp(join(tmpdir(), 'doc-kit-incremental-'));
  context.after(() => rm(output, { recursive: true, force: true }));

  return output;
};

const html = { name: 'html' };

const open = async (output, config = {}, generator = html) => {
  const store = createIncrementalStore({ enabled: true });

  return {
    store,
    section: await store.section(generator, { output, ...config }),
  };
};

const files = item => `${item.id}.html`;

const write = async (output, items) => {
  for (const item of items) {
    await writeFile(join(output, files(item)), item.id);
  }
};

/**
 * Runs a build whose `reuse` makes an upper-cased copy of each item, and
 * returns the items it was asked to make.
 */
const build = async (output, items, { generator = html, ...options } = {}) => {
  const { store, section } = await open(output, {}, generator);
  const made = [];

  const results = await Array.fromAsync(
    section.reuse(
      items,
      async function* (stale) {
        for await (const batch of stale) {
          made.push(...batch);

          yield batch.map(item => ({ id: item.id.toUpperCase() }));
        }
      },
      options
    )
  );

  await store.save();

  return { results: results.flat(), made, section };
};

describe('createIncrementalStore', () => {
  it('returns the disabled section when off or without an output', async context => {
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

  it('keeps the entries of generators that did not run, one manifest per output', async context => {
    const output = await createOutput(context);
    const other = await createOutput(context);

    await saveManifest(output, {
      schema: SCHEMA,
      generators: { json: { j: ['a.json'] }, html: { h: ['a.html'] } },
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

    assert.deepEqual((await loadManifest(output)).manifest.generators, {
      json: { j: ['a.json'] },
      html: { x: ['b.html'] },
      sitemap: { x: ['s.xml'] },
    });
    assert.deepEqual((await loadManifest(other)).manifest.generators, {
      html: { x: ['c.html'] },
    });
    assert.deepEqual(await readdir(join(output, STATE_DIRECTORY)), [
      'manifest.json',
    ]);
  });
});

describe('partition', () => {
  it('treats an item as fresh when its key wrote files that still exist', async context => {
    const output = await createOutput(context);
    const a = { id: 'a' };
    const b = { id: 'b' };

    const first = await open(output);

    assert.deepEqual(first.section.partition([a, b], { files }).stale, [a, b]);
    await write(output, [a]);
    await first.store.save();

    const recorded = (await loadManifest(output)).manifest.generators.html;

    assert.deepEqual(Object.values(recorded).toSorted(), [
      ['a.html'],
      ['b.html'],
    ]);
    assert.match(Object.keys(recorded)[0], /^[0-9a-f]{32}$/);

    // `b`'s file was recorded but never written
    const second = await open(output);

    assert.deepEqual(second.section.partition([{ id: 'a' }, b], { files }), {
      fresh: [{ id: 'a' }],
      stale: [b],
    });

    // The same item keyed differently, or with its file gone, is stale
    const third = await open(output);

    assert.deepEqual(
      third.section.partition([a], { files, key: () => 'other' }).stale,
      [a]
    );

    await rm(join(output, 'a.html'));

    const fourth = await open(output);

    assert.deepEqual(fourth.section.partition([a], { files }).stale, [a]);
  });

  it('salts keys with the configuration, minus omitted keys, and the computed parts', async context => {
    const output = await createOutput(context);
    const a = { id: 'a' };

    const first = await open(output, { title: 'A', input: 'x' });
    await first.section.salt(() => ['run']);
    first.section.partition([a], { files });
    await write(output, [a]);
    await first.store.save();

    /**
     * Whether `a` is fresh under a configuration and a computed part.
     */
    const isFresh = async (config, part) => {
      const { section } = await open(output, config);

      await section.salt(() => [part]);

      return section.partition([a], { files }).fresh.length === 1;
    };

    assert.equal(await isFresh({ title: 'A', input: 'y' }, 'run'), true);
    assert.equal(await isFresh({ title: 'B', input: 'x' }, 'run'), false);
    assert.equal(await isFresh({ title: 'A', input: 'x' }, 'other'), false);

    await assert.rejects(
      first.section.salt(() => []),
      /salted after/
    );
    await DISABLED_SECTION.salt(() => assert.fail('computed'));
  });

  it('removes the files the previous build recorded and this one did not', async context => {
    const output = await createOutput(context);

    for (const file of ['kept.html', 'stale.html', 'api/fs/old.html']) {
      await writeFile(join(output, file), file);
    }

    await writeFile(join(output, 'mine.txt'), 'not doc-kit’s');

    await saveManifest(output, {
      schema: SCHEMA,
      generators: {
        html: {
          k: ['kept.html', 'stale.html'],
          o: ['api/fs/old.html', 'missing.html'],
        },
      },
    });

    const { store, section } = await open(output);

    section.record('label', 'kept.html');
    await store.save();

    assert.equal(existsSync(join(output, 'kept.html')), true);
    assert.equal(existsSync(join(output, 'mine.txt')), true);
    assert.equal(existsSync(join(output, 'stale.html')), false);
    // The emptied directory is removed too
    assert.equal(existsSync(join(output, 'api')), false);

    assert.deepEqual((await loadManifest(output)).manifest.generators.html, {
      label: ['kept.html'],
    });
  });

  it('reuses no file from an interrupted build, but still removes them', async context => {
    const output = await createOutput(context);
    const a = { id: 'a' };
    const b = { id: 'b' };

    const first = await open(output);
    first.section.partition([a, b], { files });
    await write(output, [a, b]);
    await first.store.save();

    // Opened, and never saved
    const interrupted = await open(output);

    assert.deepEqual(interrupted.section.partition([a, b], { files }).fresh, [
      a,
      b,
    ]);

    const next = await open(output);

    assert.deepEqual(next.section.partition([a], { files }).stale, [a]);
    await next.store.save();

    assert.equal(existsSync(join(output, 'a.html')), true);
    assert.equal(existsSync(join(output, 'b.html')), false);

    // Once a build has finished, its output is reused again
    const last = await open(output);

    assert.deepEqual(last.section.partition([a], { files }).fresh, [a]);
  });
});

describe('reuse', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };

  it('makes only what the previous build did not store, in input order', async context => {
    const output = await createOutput(context);

    const first = await build(output, [a, c]);

    assert.deepEqual(first.made, [a, c]);
    assert.deepEqual(first.results, [{ id: 'A' }, { id: 'C' }]);

    // As batches, a stale item between two fresh ones
    const second = await build(
      output,
      (async function* () {
        yield [a];
        yield [b, c];
      })()
    );

    assert.deepEqual(second.made, [b]);
    assert.deepEqual(second.results, [{ id: 'A' }, { id: 'B' }, { id: 'C' }]);
  });

  it('removes stored results that are no longer used', async context => {
    const output = await createOutput(context);
    const stored = join(output, STATE_DIRECTORY, 'html');

    await build(output, [a, b]);
    assert.equal((await readdir(stored)).length, 2);

    await build(output, [a]);
    assert.equal((await readdir(stored)).length, 1);

    await build(output, []);
    assert.equal(existsSync(stored), false);
  });

  it('reuses the results an interrupted build stored', async context => {
    const output = await createOutput(context);

    await build(output, [a]);

    // Makes `b`, and is never saved
    const { section } = await open(output);

    await Array.fromAsync(
      section.reuse([a, b], async function* (stale) {
        for await (const batch of stale) {
          yield batch.map(() => ({ id: 'B' }));
        }
      })
    );

    assert.deepEqual((await build(output, [a, b])).made, []);
  });

  it('keys an item made from a result by the key the result was stored under', async context => {
    const output = await createOutput(context);
    const pages = { name: 'pages' };

    /**
     * Makes results from the items, then pages from the results, and returns
     * the results that pages were made from.
     */
    const run = async items => {
      const { results } = await build(output, items);

      return (await build(output, results, { generator: pages })).made;
    };

    assert.deepEqual(await run([a, b]), [{ id: 'A' }, { id: 'B' }]);
    assert.deepEqual(await run([a, b]), []);

    // A different item giving the same result: the page is still made again
    assert.deepEqual(await run([a, { id: 'b', edited: true }]), [{ id: 'B' }]);
  });

  it('reads results from the files the generator wrote', async context => {
    const output = await createOutput(context);

    /**
     * Makes a document of each item, written to a file of its own.
     */
    const run = async items => {
      const { store, section } = await open(output);
      const made = [];

      const documents = await Array.fromAsync(
        section.reuse(
          items,
          async function* (stale) {
            for await (const batch of stale) {
              made.push(...batch);

              for (const { id } of batch) {
                await writeJSON(join(output, `${id}.json`), { id });
              }

              yield batch.map(({ id }) => ({ id }));
            }
          },
          { file: item => `${item.id}.json`, read: readJSON }
        )
      );

      await store.save();

      return { documents: documents.flat(), made };
    };

    await run([a, b]);

    assert.deepEqual(await run([a, b]), { documents: [a, b], made: [] });
    assert.equal(existsSync(join(output, STATE_DIRECTORY, 'html')), false);

    // A file that is no longer made is removed
    assert.deepEqual(await run([b]), { documents: [b], made: [] });
    assert.equal(existsSync(join(output, 'a.json')), false);
  });

  it('rethrows a failure in `make` after yielding the earlier results', async context => {
    const output = await createOutput(context);
    const { section } = await open(output);
    const results = [];

    await assert.rejects(async () => {
      const reused = section.reuse([a, b], async function* (stale) {
        await Array.fromAsync(stale);

        yield [{ id: 'A' }];

        throw new Error('boom');
      });

      for await (const batch of reused) {
        results.push(...batch);
      }
    }, /boom/);

    assert.deepEqual(results, [{ id: 'A' }]);
  });
});
