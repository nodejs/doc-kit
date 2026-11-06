import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getEntryDescription,
  groupNodesByModule,
  groupWholeModules,
  getVersionFromSemVer,
  coerceSemVer,
  getCompatibleVersions,
  merge,
  toBatches,
} from '../generators.mjs';

describe('getEntryDescription', () => {
  it('returns llm_description when available', () => {
    const entry = {
      llm_description: 'LLM generated description',
      content: { children: [] },
    };

    const result = getEntryDescription(entry);
    assert.equal(result, 'LLM generated description');
  });

  it('extracts first paragraph when no llm_description', () => {
    const entry = {
      content: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: 'First paragraph' }],
          },
        ],
      },
    };

    const result = getEntryDescription(entry);
    assert.ok(result.length > 0);
  });

  it('returns empty string when no paragraph found', () => {
    const entry = {
      content: {
        children: [
          { type: 'heading', children: [{ type: 'text', value: 'Title' }] },
        ],
      },
    };

    const result = getEntryDescription(entry);
    assert.equal(result, '');
  });

  it('removes newlines from description', () => {
    const entry = {
      content: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: 'Line 1\nLine 2\r\nLine 3' }],
          },
        ],
      },
    };

    const result = getEntryDescription(entry);
    assert.equal(result.includes('\n'), false);
    assert.equal(result.includes('\r'), false);
  });
});

describe('groupNodesByModule', () => {
  it('groups nodes by api property', () => {
    const nodes = [
      { api: 'fs', name: 'readFile' },
      { api: 'http', name: 'createServer' },
      { api: 'fs', name: 'writeFile' },
    ];

    const result = groupNodesByModule(nodes);
    assert.equal(result.get('fs').length, 2);
    assert.equal(result.get('http').length, 1);
  });

  it('handles empty array', () => {
    const result = groupNodesByModule([]);
    assert.equal(result.size, 0);
  });
});

describe('groupWholeModules', () => {
  /**
   * Collects the batches regrouped from the given input, each entry as its
   * module and number.
   *
   * @param {Array<{ api: string }> | AsyncIterable<Array<{ api: string }>>} input
   * @returns {Promise<string[][]>}
   */
  const collect = async input => {
    const output = [];

    for await (const batch of groupWholeModules(input)) {
      output.push(batch.map(({ api, n }) => `${api}${n}`));
    }

    return output;
  };

  /**
   * Regroups the given batches, streamed in, and collects the batches it
   * yields.
   *
   * @param {Array<Array<{ api: string }>>} batches
   * @returns {Promise<string[][]>}
   */
  const regroup = batches => {
    async function* input() {
      yield* batches;
    }

    return collect(input());
  };

  /**
   * An entry of a module, told apart from the module's others by its number.
   *
   * @param {string} api
   * @param {number} n
   * @returns {{ api: string, n: number }}
   */
  const entry = (api, n) => ({ api, n });

  it('passes the entries on in the same order, each batch ending once its last module is whole', async () => {
    const output = await regroup([
      [entry('a', 1), entry('a', 2), entry('b', 1)],
      [entry('c', 1)],
    ]);

    assert.deepEqual(output, [['a1', 'a2'], ['b1'], ['c1']]);
  });

  it('holds back a module that continues in the next batch', async () => {
    const output = await regroup([
      [entry('a', 1), entry('b', 1)],
      [entry('b', 2), entry('b', 3)],
      [entry('b', 4), entry('c', 1)],
    ]);

    assert.deepEqual(output, [['a1'], ['b1', 'b2', 'b3', 'b4'], ['c1']]);
  });

  it('skips empty batches', async () => {
    const output = await regroup([[], [entry('a', 1)], []]);

    assert.deepEqual(output, [['a1']]);
  });

  it('takes entries given as one array as a single batch', async () => {
    const output = await collect([entry('a', 1), entry('a', 2), entry('b', 1)]);

    assert.deepEqual(output, [['a1', 'a2'], ['b1']]);
  });

  it('rejects a module whose entries arrive apart', async () => {
    await assert.rejects(
      regroup([
        [entry('a', 1), entry('b', 1)],
        [entry('c', 1), entry('a', 2)],
      ]),
      /"a" arrived apart/
    );
  });

  it('rejects a module whose entries arrive apart in one batch too', async () => {
    await assert.rejects(
      regroup([[entry('a', 1), entry('b', 1), entry('a', 2)]]),
      /"a" arrived apart/
    );
  });
});

describe('getVersionFromSemVer', () => {
  it('returns major.x for minor 0', () => {
    const version = { major: 18, minor: 0, patch: 0 };
    const result = getVersionFromSemVer(version);
    assert.equal(result, '18.x');
  });

  it('returns major.minor.x for non-zero minor', () => {
    const version = { major: 18, minor: 5, patch: 2 };
    const result = getVersionFromSemVer(version);
    assert.equal(result, '18.5.x');
  });
});

describe('coerceSemVer', () => {
  it('returns valid semver unchanged', () => {
    const result = coerceSemVer('1.2.3');
    assert.equal(result.version, '1.2.3');
  });

  it('coerces invalid version to fallback', () => {
    const result = coerceSemVer('invalid');
    assert.equal(result.version, '0.0.0');
  });

  it('handles null input', () => {
    const result = coerceSemVer(null);
    assert.equal(result.version, '0.0.0');
  });
});

describe('getCompatibleVersions', () => {
  it('filters releases by major version', () => {
    const releases = [
      { version: { major: 16 } },
      { version: { major: 18 } },
      { version: { major: 20 } },
    ];

    const result = getCompatibleVersions('18.0.0', releases);
    assert.equal(result.length, 2);
    assert.equal(result[0].version.major, 18);
    assert.equal(result[1].version.major, 20);
  });

  it('includes all releases when introduced version is old', () => {
    const releases = [{ version: { major: 16 } }, { version: { major: 18 } }];

    const result = getCompatibleVersions('14.0.0', releases);
    assert.equal(result.length, 2);
  });
});

describe('toBatches', () => {
  it('gives an array as a single batch, and batches as they are', async () => {
    async function* batches() {
      yield [1];
    }

    const streamed = batches();

    assert.deepEqual(toBatches([1, 2]), [[1, 2]]);
    assert.equal(toBatches(streamed), streamed);
  });
});

describe('merge', () => {
  it('yields each item as soon as it arrives, until every source ends', async () => {
    const gate = Promise.withResolvers();

    async function* slow() {
      await gate.promise;

      yield 'slow';
    }

    async function* fast() {
      yield 'fast';
      yield 'faster';
    }

    const items = [];

    for await (const item of merge(slow(), fast())) {
      items.push(item);

      if (item === 'faster') {
        gate.resolve();
      }
    }

    assert.deepEqual(items, ['fast', 'faster', 'slow']);
  });

  it('throws a failure without waiting for the other sources', async () => {
    async function* never() {
      await new Promise(() => {});

      yield 'never';
    }

    async function* failing() {
      yield 'before';

      throw new Error('merged failure');
    }

    const items = [];

    await assert.rejects(async () => {
      for await (const item of merge(never(), failing())) {
        items.push(item);
      }
    }, /merged failure/);

    assert.deepEqual(items, ['before']);
  });
});
