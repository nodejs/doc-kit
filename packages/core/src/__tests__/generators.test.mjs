import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';

// Tracks how many times each synthetic generator actually executed so we can
// assert that a shared dependency runs exactly once even after its result is
// evicted from the cache once its last consumer has read it.
const runs = {};

const record = name => {
  runs[name] = (runs[name] ?? 0) + 1;
};

// Yields a single chunk as an async generator (mirrors streaming generators)
const streamOf = chunk =>
  (async function* () {
    yield chunk;
  })();

// Lets `gated-source` wait for its streaming reader
const gate = { opened: Promise.withResolvers(), openedBy: undefined };

// Synthetic generators keyed by specifier (any string works as a specifier)
const syntheticGenerators = {
  // Root streaming generator (no dependency)
  ast: {
    name: 'ast',
    hasParallelProcessor: true,
    generate: async () => {
      record('ast');
      return streamOf([{ ast: true }]);
    },
  },
  // Streaming generator shared by multiple consumers
  metadata: {
    name: 'metadata',
    dependsOn: 'ast',
    hasParallelProcessor: true,
    generate: async input => {
      record('metadata');
      return streamOf([{ meta: input.length }]);
    },
  },
  // Two non-streaming consumers of the shared `metadata` result
  'gen-a': {
    name: 'gen-a',
    dependsOn: 'metadata',
    generate: async input => {
      record('gen-a');
      return { a: input };
    },
  },
  'gen-b': {
    name: 'gen-b',
    dependsOn: 'metadata',
    generate: async input => {
      record('gen-b');
      return { b: input };
    },
  },
  // A target that is itself depended upon by another target
  'gen-c': {
    name: 'gen-c',
    dependsOn: 'metadata',
    hasParallelProcessor: true,
    generate: async () => {
      record('gen-c');
      return streamOf([{ c: true }]);
    },
  },
  'gen-c-all': {
    name: 'gen-c-all',
    dependsOn: 'gen-c',
    generate: async input => {
      record('gen-c-all');
      return { all: input };
    },
  },
  // A generator delivered through another pipeline: it reads `metadata` and
  // declares `gen-d-all` as its dependent, so `gen-d` reads from it instead.
  'gen-splice': {
    name: 'gen-splice',
    dependsOn: 'metadata',
    dependent: 'gen-d-all',
    generate: async input => {
      record('gen-splice');
      return [...input, { spliced: true }];
    },
  },
  'gen-d': {
    name: 'gen-d',
    dependsOn: 'metadata',
    generate: async input => {
      record('gen-d');
      return { d: input };
    },
  },
  'gen-d-all': {
    name: 'gen-d-all',
    dependsOn: 'gen-d',
    generate: async input => {
      record('gen-d-all');
      return { all: input };
    },
  },
  // A source that only yields its second chunk once its streaming reader has
  // received the first, or after a second, recording which happened first
  'gated-source': {
    name: 'gated-source',
    hasParallelProcessor: true,
    generate: async () => {
      record('gated-source');

      return (async function* () {
        yield [1];

        let timer;

        const timeout = new Promise(resolve => {
          timer = setTimeout(resolve, 1000, 'timeout');
        });

        gate.openedBy = await Promise.race([gate.opened.promise, timeout]);

        clearTimeout(timer);

        yield [2];
      })();
    },
  },
  'stream-reader': {
    name: 'stream-reader',
    dependsOn: 'gated-source',
    streamsInput: true,
    async *generate(input) {
      record('stream-reader');

      for await (const chunk of input) {
        gate.opened.resolve('reader');

        yield [{ streamed: chunk }];
      }
    },
  },
  // A source that fails before yielding anything, read only by a generator
  // that streams its input and starts reading it a turn of the event loop
  // later, once a failure left unhandled would have been reported
  'failing-source': {
    name: 'failing-source',
    hasParallelProcessor: true,
    generate: async () => {
      throw new Error('source failed');
    },
  },
  'slow-reader': {
    name: 'slow-reader',
    dependsOn: 'failing-source',
    streamsInput: true,
    async *generate(input) {
      await new Promise(resolve => setImmediate(resolve));

      for await (const chunk of input) {
        yield chunk;
      }
    },
  },
  'shape-reader': {
    name: 'shape-reader',
    dependsOn: 'metadata',
    streamsInput: true,
    generate: async input => ({ array: Array.isArray(input) }),
  },
  'collect-reader': {
    name: 'collect-reader',
    dependsOn: 'gated-source',
    generate: async input => {
      record('collect-reader');
      return { collected: input };
    },
  },
};

mock.module('../generators/loader.mjs', {
  exports: {
    resolveGeneratorSpecifier: specifier => specifier,
    loadGenerator: async specifier => syntheticGenerators[specifier],
    loadGenerators: async targets => {
      const generators = new Map();
      const queue = [...targets];

      while (queue.length > 0) {
        const specifier = queue.shift();

        if (generators.has(specifier)) {
          continue;
        }

        const generator = syntheticGenerators[specifier];
        generators.set(specifier, generator);

        for (const related of [generator.dependsOn, generator.dependent]) {
          if (related) {
            queue.push(related);
          }
        }
      }

      return generators;
    },
  },
});

mock.module('../threading/index.mjs', {
  exports: {
    default: () => ({
      run: async () => undefined,
      destroy: async () => undefined,
    }),
  },
});

mock.module('../threading/parallel.mjs', {
  exports: {
    default: () => ({
      async *stream() {
        // Unused: the mocked generators return their own async generators
      },
    }),
  },
});

// The Markdown pipelines loaded, with the generators that had run by then
const loadedPipelines = [];

mock.module('../utils/markdown/plugins.mjs', {
  exports: {
    loadMarkdownPlugins: async ({ name }, markdown) => {
      loadedPipelines.push({ name, markdown, ran: Object.keys(runs) });
    },
  },
});

const createGenerator = (await import('../generators.mjs')).default;

describe('createGenerator orchestration', () => {
  beforeEach(() => {
    for (const key of Object.keys(runs)) {
      delete runs[key];
    }
  });

  it('runs a shared dependency exactly once and returns correct results', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators({
      target: ['gen-a', 'gen-b'],
      threads: 1,
    });

    // ast -> metadata are shared and must each execute a single time
    assert.equal(runs.ast, 1);
    assert.equal(runs.metadata, 1);
    assert.equal(runs['gen-a'], 1);
    assert.equal(runs['gen-b'], 1);

    // metadata collected one entry whose `meta` is the ast array length (1)
    assert.deepStrictEqual(results, [
      { a: [{ meta: 1 }] },
      { b: [{ meta: 1 }] },
    ]);
  });

  it('does not re-run a target that is also another target dependency', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators({
      target: ['gen-c', 'gen-c-all'],
      threads: 1,
    });

    // gen-c is both a requested target and a dependency of gen-c-all; eviction
    // must not cause it to be scheduled (and run) twice.
    assert.equal(runs['gen-c'], 1);
    assert.equal(runs['gen-c-all'], 1);

    assert.deepStrictEqual(results, [[{ c: true }], { all: [{ c: true }] }]);
  });

  it('delivers a generator through its dependent', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators({
      target: ['gen-splice'],
      threads: 1,
    });

    // Requesting only `gen-splice` runs its dependent's whole pipeline, with
    // `gen-d` reading the spliced output instead of `metadata` directly.
    assert.equal(runs.metadata, 1);
    assert.equal(runs['gen-splice'], 1);
    assert.equal(runs['gen-d'], 1);
    assert.equal(runs['gen-d-all'], 1);

    assert.deepStrictEqual(results, [
      { all: { d: [{ meta: 1 }, { spliced: true }] } },
    ]);
  });

  it('loads the Markdown pipeline of each generator as it starts', async () => {
    const { runGenerators } = createGenerator();
    const markdown = { remarkPlugins: ['file:///plugin.mjs'] };

    loadedPipelines.length = 0;

    await runGenerators({
      target: ['gen-a'],
      threads: 1,
      'gen-a': { markdown },
    });

    assert.deepStrictEqual(loadedPipelines, [
      { name: 'ast', markdown: undefined, ran: [] },
      { name: 'metadata', markdown: undefined, ran: ['ast'] },
      { name: 'gen-a', markdown, ran: ['ast', 'metadata'] },
    ]);
  });

  it('streams a dependency to a generator that streams its input', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators({
      target: ['stream-reader', 'collect-reader'],
      threads: 2,
    });

    // The reader got the first chunk while the source was still running
    assert.equal(gate.openedBy, 'reader');
    assert.equal(runs['gated-source'], 1);

    assert.deepStrictEqual(results, [
      [{ streamed: [1] }, { streamed: [2] }],
      { collected: [1, 2] },
    ]);
  });

  it('rejects with the failure of a dependency read as a stream', async () => {
    const { runGenerators } = createGenerator();
    const unhandled = [];
    const onUnhandled = error => unhandled.push(error);

    process.on('unhandledRejection', onUnhandled);

    try {
      await assert.rejects(
        runGenerators({ target: ['slow-reader'], threads: 2 }),
        /source failed/
      );

      // A rejection left unhandled is reported once the microtasks have run
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    assert.deepStrictEqual(unhandled, []);
  });

  it('gives a generator that streams its input the whole input with one thread', async () => {
    const one = await createGenerator().runGenerators({
      target: ['shape-reader'],
      threads: 1,
    });
    const two = await createGenerator().runGenerators({
      target: ['shape-reader'],
      threads: 2,
    });

    assert.deepStrictEqual(one, [{ array: true }]);
    assert.deepStrictEqual(two, [{ array: false }]);
  });

  it('runs every generator but keeps no results with results: false', async () => {
    const { runGenerators } = createGenerator();

    const results = await runGenerators(
      { target: ['gen-c', 'gen-c-all'], threads: 1 },
      { results: false }
    );

    assert.equal(results, undefined);
    assert.equal(runs['gen-c'], 1);
    assert.equal(runs['gen-c-all'], 1);
  });

  it('rejects with a failure with results: false', async () => {
    await assert.rejects(
      createGenerator().runGenerators(
        { target: ['slow-reader'], threads: 2 },
        { results: false }
      ),
      /source failed/
    );
  });
});
