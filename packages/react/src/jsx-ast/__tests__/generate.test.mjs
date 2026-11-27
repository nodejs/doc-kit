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

const collect = async output => {
  const items = (await Array.fromAsync(output)).flat();
  const manifests = items.filter(item => 'manifest' in item);

  return {
    pages: items
      .filter(item => !('manifest' in item))
      .map(({ data }) => data.api),
    manifests: manifests.map(({ manifest }) => manifest.map(({ api }) => api)),
  };
};

const createWorker = seenItems => ({
  async *stream(batches) {
    for await (const items of batches) {
      seenItems.push(...items);
      yield items.map(({ head }) => ({ type: 'JSXElement', data: head }));
    }
  },
});

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
        [[createEntry('index', 'Index'), createEntry('fs', 'File system')]],
        createWorker(seenItems)
      )
    );

    assert.deepEqual(
      seenItems.map(({ head }) => head.api),
      ['index', 'fs']
    );
    assert.deepEqual(pages, ['index', 'fs']);
    assert.deepEqual(manifests, [['index', 'fs']]);
  });

  it(
    'emits the manifest once the input ends, before the pages still building',
    // The worker builds nothing until the manifest is out
    { timeout: 10_000 },
    async () => {
      await setConfig({ target: ['jsx-ast'] });

      const gate = Promise.withResolvers();

      // Takes the next batch only once this one is built, as worker.stream
      // does once it has no room
      const worker = {
        async *stream(batches) {
          for await (const items of batches) {
            await gate.promise;

            yield items.map(({ head }) => ({ data: head }));
          }
        },
      };

      const output = generate(
        [
          [createEntry('fs', 'File system')],
          [createEntry('buffer', 'Buffer'), createEntry('index', 'Index')],
        ],
        worker
      );

      const { value } = await output.next();

      assert.deepEqual(
        value[0].manifest.map(({ api }) => api),
        ['index', 'buffer', 'fs', '404']
      );

      gate.resolve();

      const { pages } = await collect(output);

      assert.deepEqual(pages, ['fs', 'buffer', 'index', '404']);
    }
  );

  it('emits the same from one batch as from several', async () => {
    await setConfig({ target: ['jsx-ast'] });

    const fs = createEntry('fs', 'File system');
    const buffer = createEntry('buffer', 'Buffer');

    const streamed = await collect(
      generate([[fs], [buffer]], createWorker([]))
    );
    const whole = await collect(generate([[fs, buffer]], createWorker([])));

    assert.deepEqual(whole, streamed);
    assert.deepEqual(whole.manifests, [['buffer', 'fs', '404']]);
  });

  it('rejects with the failure of its input, leaving none unhandled', async () => {
    await setConfig({ target: ['jsx-ast'] });

    const failure = new Error('input failed');
    const unhandled = [];
    const onUnhandled = error => unhandled.push(error);

    async function* failing() {
      yield [createEntry('fs', 'File system')];

      throw failure;
    }

    process.on('unhandledRejection', onUnhandled);

    try {
      await assert.rejects(
        collect(generate(failing(), createWorker([]))),
        failure
      );

      // Unhandled rejections are reported once the microtasks have run
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    assert.deepEqual(unhandled, []);
  });

  it(
    'lets go of the pages it emits before the manifest',
    // The input only ends once the test lets it
    { timeout: 10_000 },
    async () => {
      await setConfig({ target: ['jsx-ast'] });

      const released = new Set();
      const registry = new FinalizationRegistry(api => released.add(api));
      const end = Promise.withResolvers();

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

      // The last page read may still be in a register, the first must not be
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
      await Array.fromAsync(output);

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
