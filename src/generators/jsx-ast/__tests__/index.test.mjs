import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const buildSideBarProps = mock.fn(() => ({ sidebar: true }));
mock.module('../utils/buildBarProps.mjs', {
  namedExports: { buildSideBarProps },
});

const buildContent = mock.fn(async (_entries, head, sideBarProps, remark) => ({
  type: 'content',
  head,
  sideBarProps,
  remark,
}));
mock.module('../utils/buildContent.mjs', {
  defaultExport: buildContent,
});

const getSortedHeadNodes = mock.fn(input => input.filter(n => n.isHead));
mock.module('../utils/getSortedHeadNodes.mjs', {
  namedExports: { getSortedHeadNodes },
});

const groupNodesByModule = mock.fn(input => {
  const map = new Map();
  for (const entry of input) {
    const arr = map.get(entry.api) ?? [];
    arr.push(entry);
    map.set(entry.api, arr);
  }
  return map;
});
mock.module('../../../utils/generators.mjs', {
  namedExports: { groupNodesByModule },
});

const remarkRecma = { id: 'remark' };
mock.module('../../../utils/remark.mjs', {
  namedExports: { getRemarkRecma: () => remarkRecma },
});

const gen = (await import('../index.mjs')).default;

describe('generators/jsx-ast/index', () => {
  it('processChunk builds sidebar props and content per index', async () => {
    const head1 = { api: 'fs', heading: { data: { name: 'fs' } } };
    const head2 = { api: 'tls', heading: { data: { name: 'tls' } } };

    const slicedInput = [
      { head: head1, entries: [head1] },
      { head: head2, entries: [head2, { api: 'tls' }] },
    ];

    const res = await gen.processChunk(slicedInput, [1], {
      docPages: [],
      releases: [],
      version: { raw: 'v1.0.0' },
    });

    assert.equal(buildSideBarProps.mock.callCount(), 1);
    assert.equal(buildContent.mock.callCount(), 1);

    assert.equal(res.length, 1);
    assert.equal(res[0].head.api, 'tls');
    assert.equal(res[0].remark, remarkRecma);
  });

  it('generate computes docPages and streams worker output', async () => {
    const input = [
      { api: 'fs', isHead: true, heading: { data: { name: 'File system' } } },
      { api: 'tls', isHead: true, heading: { data: { name: 'TLS' } } },
      { api: 'fs', isHead: false, heading: { data: { name: 'Other' } } },
    ];

    const streamArgs = [];
    const worker = {
      async *stream(entries, _allEntries, deps) {
        streamArgs.push({ entries, deps });
        yield ['chunk'];
      },
    };

    const chunks = [];
    for await (const chunk of gen.generate(input, {
      index: undefined,
      releases: [],
      version: { raw: 'v1.0.0' },
      worker,
    })) {
      chunks.push(chunk);
    }

    assert.deepEqual(chunks, [['chunk']]);

    assert.equal(streamArgs.length, 1);
    assert.deepEqual(streamArgs[0].deps.docPages, [
      ['File system', 'fs.html'],
      ['TLS', 'tls.html'],
    ]);
  });

  it('generate uses provided index to compute docPages', async () => {
    const input = [
      { api: 'fs', isHead: true, heading: { data: { name: 'File system' } } },
    ];

    const worker = {
      async *stream(_entries, _allEntries, deps) {
        yield deps.docPages;
      },
    };

    const chunks = [];
    for await (const chunk of gen.generate(input, {
      index: [{ section: 'fs', api: 'fs' }],
      releases: [],
      version: { raw: 'v1.0.0' },
      worker,
    })) {
      chunks.push(chunk);
    }

    assert.deepEqual(chunks, [[['fs', 'fs.html']]]);
  });
});
