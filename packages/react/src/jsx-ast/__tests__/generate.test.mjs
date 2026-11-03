import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import getConfig, {
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';

import { generate, processChunk } from '../generate.mjs';

setFlagsFromString('--expose-gc');

// Collects garbage, to tell what is let go
const gc = runInNewContext('gc');

// Pages are rendered with the pipeline of `jsx-ast`
await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../index.mjs'))
);

const createEntry = (api, name, { stabilityIndex = '2' } = {}) => {
  const heading = {
    type: 'heading',
    depth: 1,
    children: [{ type: 'text', value: name }],
    data: { name, text: name, slug: api },
  };

  return {
    api,
    path: `/${api}`,
    basename: api,
    heading,
    stability:
      stabilityIndex == null
        ? null
        : {
            data: {
              index: stabilityIndex,
              description: `${name} stable. Longer description.`,
            },
          },
    content: {
      type: 'root',
      children: [
        heading,
        {
          type: 'paragraph',
          children: [{ type: 'text', value: `${name} body` }],
        },
      ],
    },
  };
};

/**
 * Reads everything the generator emits, keeping the pages apart from the
 * manifests.
 *
 * @param {AsyncIterable<Array<object>>} output
 * @returns {Promise<{ pages: Array<object>, manifests: Array<Array<object>> }>}
 */
const collect = async output => {
  const pages = [];
  const manifests = [];

  for await (const items of output) {
    for (const item of items) {
      if ('manifest' in item) {
        manifests.push(item.manifest);
      } else {
        pages.push(item);
      }
    }
  }

  return { pages, manifests };
};

/**
 * Stands in for the worker pool: builds each page from its head alone, as its
 * batch arrives, and records every item it is given.
 *
 * @param {Array<object>} seenItems - Where the items it is given go
 */
const createWorker = seenItems => ({
  async *stream(batches) {
    for await (const items of batches) {
      seenItems.push(...items);
      yield items.map(({ head }) => ({ type: 'JSXElement', data: head }));
    }
  },
});

/**
 * Yields each batch in turn, as a streamed input.
 *
 * @param {Array<Array<object>>} batches
 */
async function* streamOf(batches) {
  yield* batches;
}

describe('jsx-ast generate', () => {
  it('returns the page content as a JSX fragment alongside its ToC', async () => {
    await setConfig({ target: ['jsx-ast'] });

    const fs = createEntry('fs', 'File system');
    const [page] = await processChunk([{ head: fs, entries: [fs] }], [0]);

    assert.equal(page.data.api, 'fs');
    assert.equal('sectionEntries' in page, false);
    // The layout is the html generator's: only the content is serialized
    assert.match(page.content, /^<>/);
    assert.doesNotMatch(page.content, /<Layout/);
    assert.match(page.content, /File system body/);
    assert.deepEqual(
      page.headings.map(({ value }) => value),
      ['File system']
    );
    assert.equal(page.readingTime, undefined);
  });

  it('respects jsx-ast synthetic page flags', async () => {
    await setConfig({ target: ['jsx-ast'] });

    getConfig('jsx-ast').generateNotFoundPage = false;

    const seenItems = [];
    const { pages, manifests } = await collect(
      generate(
        streamOf([
          [createEntry('index', 'Index'), createEntry('fs', 'File system')],
        ]),
        createWorker(seenItems)
      )
    );

    assert.deepEqual(
      seenItems.map(({ head }) => head.api),
      ['index', 'fs']
    );
    assert.deepEqual(
      pages.map(({ data }) => data.api),
      ['index', 'fs']
    );

    // Without the 404 page, the manifest lists only the input's pages
    assert.deepEqual(
      manifests.map(heads => heads.map(({ api }) => api)),
      [['index', 'fs']]
    );
  });

  it('starts pages as they arrive and emits them as they are built', async () => {
    await setConfig({ target: ['jsx-ast'] });

    const seenItems = [];
    const { pages, manifests } = await collect(
      generate(
        streamOf([
          [createEntry('fs', 'File system')],
          [createEntry('buffer', 'Buffer'), createEntry('index', 'Index')],
        ]),
        createWorker(seenItems)
      )
    );

    // Built in the order they arrived, the 404 page last
    assert.deepEqual(
      seenItems.map(({ head }) => head.api),
      ['fs', 'buffer', 'index', '404']
    );

    // Emitted as built: the html generator puts them in the site's order
    assert.deepEqual(
      pages.map(({ data }) => data.api),
      ['fs', 'buffer', 'index', '404']
    );

    // Once every page has arrived, every page's head, in that order
    assert.deepEqual(
      manifests.map(heads => heads.map(({ api }) => api)),
      [['fs', 'buffer', 'index', '404']]
    );
  });

  it('builds the same pages from its whole input, as it gets it with one thread', async () => {
    await setConfig({ target: ['jsx-ast'] });

    const entries = () => [
      createEntry('fs', 'File system'),
      createEntry('buffer', 'Buffer'),
    ];

    const streamed = await collect(
      generate(streamOf([entries()]), createWorker([]))
    );
    const whole = await collect(generate(entries(), createWorker([])));

    assert.deepEqual(whole, streamed);

    // The manifest still comes with them
    assert.equal(whole.manifests.length, 1);
  });

  it(
    'emits the manifest without waiting for the pages still being built',
    // The first page is built only once the manifest has arrived, so a
    // manifest that waited for it would never come
    { timeout: 10_000 },
    async () => {
      await setConfig({ target: ['jsx-ast'] });

      const gate = Promise.withResolvers();
      const worker = {
        async *stream(batches) {
          const all = [];

          // Like the pool, every batch is taken as it arrives
          for await (const items of batches) {
            all.push(items);
          }

          for (const items of all) {
            // The first page takes until the test lets it finish
            if (items.some(({ head }) => head.api === 'fs')) {
              await gate.promise;
            }

            yield items.map(({ head }) => ({ data: head }));
          }
        },
      };

      const output = generate(
        streamOf([[createEntry('fs', 'File system')]]),
        worker
      );

      const { value } = await output.next();

      assert.deepEqual(
        value[0].manifest.map(({ api }) => api),
        ['fs', '404']
      );

      gate.resolve();

      const { pages } = await collect(output);

      assert.deepEqual(
        pages.map(({ data }) => data.api),
        ['fs', '404']
      );
    }
  );

  it(
    'lets go of the pages it emits before the manifest',
    // The input only ends once the test lets it, so pages that waited for the
    // manifest would never come
    { timeout: 10_000 },
    async () => {
      await setConfig({ target: ['jsx-ast'] });

      const released = new Set();
      const registry = new FinalizationRegistry(api => released.add(api));
      const end = Promise.withResolvers();

      // `metadata` is still running, so the manifest waits for it
      async function* input() {
        yield [createEntry('fs', 'File system')];
        yield [createEntry('zlib', 'Zlib')];
        yield [createEntry('buffer', 'Buffer')];
        await end.promise;
      }

      const worker = {
        async *stream(batches) {
          for await (const items of batches) {
            yield items.map(({ head }) => {
              const page = { data: head };

              registry.register(page, head.api);

              return page;
            });
          }
        },
      };

      const output = generate(input(), worker);

      // Each module's page is built once the next module arrives, and read as
      // `html` reads it, letting go of it once it has it. The last one read may
      // still be in a register: the first one must not be held.
      await output.next();
      await output.next();

      const reading = output.next();

      for (let i = 0; i < 10 && !released.has('fs'); i++) {
        await new Promise(resolve => setImmediate(resolve));
        gc();
      }

      const releasedEarly = released.has('fs');

      end.resolve();

      await reading;
      await collect(output);

      assert.equal(releasedEarly, true);
    }
  );

  it('does not change its input on the main thread', async () => {
    await setConfig({ target: ['jsx-ast'] });

    const fs = createEntry('fs', 'File system');
    const before = structuredClone(fs);

    await processChunk([{ head: fs, entries: [fs] }], [0]);

    assert.deepEqual(fs, before);
  });
});
