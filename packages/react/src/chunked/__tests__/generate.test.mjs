import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import getConfig, {
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';

import { generate } from '../generate.mjs';

/**
 * Builds a metadata-shaped entry whose heading node is shared between
 * `heading` and `content`, exactly like the metadata generator produces.
 */
const createEntry = (api, depth, text, { name = text, type, slug } = {}) => {
  const heading = {
    type: 'heading',
    depth,
    children: [{ type: 'text', value: text }],
    data: { text, name, slug: slug ?? text.toLowerCase(), type },
  };

  return {
    api,
    path: `/${api}`,
    basename: api,
    heading,
    stability: null,
    content: {
      type: 'root',
      children: [
        heading,
        {
          type: 'paragraph',
          children: [{ type: 'text', value: `${text} body` }],
        },
      ],
    },
  };
};

const createModule = () => [
  {
    ...createEntry('fs', 1, 'File system', { slug: 'file-system' }),
    introduced_in: 'v0.10.0',
  },
  createEntry('fs', 2, 'Callback API'),
  createEntry('fs', 3, '`fs.readFile(path, callback)`', {
    name: 'readFile',
    type: 'method',
  }),
  createEntry('fs', 4, 'File descriptors', { slug: 'file-descriptors' }),
  createEntry('fs', 2, 'Class: `fs.Dir`', {
    name: 'fs.Dir',
    type: 'class',
    slug: 'class-fsdir',
  }),
  createEntry('fs', 3, "Event: `'close'`", { name: 'close', type: 'event' }),
];

const link = url => ({
  type: 'paragraph',
  children: [{ type: 'link', url, children: [{ type: 'text', value: url }] }],
});

describe('chunked generate', () => {
  before(async () => {
    await setConfig({ target: ['chunked'] });

    // The module below splits at depth 3
    getConfig('chunked').maxDepth = 3;
  });

  it('keeps every original entry and appends the chunk pages', async () => {
    const input = createModule();
    const output = await generate(input);

    assert.deepEqual(output.slice(0, input.length), input);

    const chunkHeads = output.filter(e => e.chunk && e.heading.depth === 1);

    assert.deepEqual(
      chunkHeads.map(e => e.path),
      ['/fs/callback-api', '/fs/readFile', '/fs/Dir']
    );
    assert.deepEqual(
      chunkHeads.map(e => e.api),
      ['fs-callback-api', 'fs-readFile', 'fs-Dir']
    );
    assert.deepEqual(
      chunkHeads.map(e => e.basename),
      ['callback-api', 'readFile', 'Dir']
    );
    assert.deepEqual(
      chunkHeads.map(e => e.title),
      ['Callback API', 'fs.readFile', 'fs.Dir']
    );
  });

  it('describes where each chunk came from', async () => {
    const output = await generate(createModule());
    const readFile = output.find(e => e.path === '/fs/readFile');

    assert.deepEqual(readFile.chunk, {
      api: 'fs',
      path: '/fs',
      slug: '`fs.readfile(path, callback)`',
      index: 1,
      depth: 3,
    });
    assert.equal(readFile.introduced_in, 'v0.10.0');
  });

  it('promotes headings so the chunk reads as its own page', async () => {
    const output = await generate(createModule());

    const dir = output.filter(e => e.api === 'fs-Dir');
    assert.deepEqual(
      dir.map(e => e.heading.depth),
      [1, 2]
    );
    assert.deepEqual(
      dir.map(e => e.content.children[0].depth),
      [1, 2]
    );

    const readFile = output.filter(e => e.api === 'fs-readFile');
    assert.deepEqual(
      readFile.map(e => e.heading.depth),
      [1, 2]
    );
  });

  it('does not mutate the original entries', async () => {
    const input = createModule();
    const snapshot = structuredClone(input);

    await generate(input);

    assert.deepEqual(input, snapshot);
  });

  it('leaves modules with a single section alone', async () => {
    const output = await generate([
      createEntry('tiny', 1, 'Tiny'),
      createEntry('tiny', 2, '`tiny.only()`', { name: 'only', type: 'method' }),
    ]);

    assert.equal(output.length, 2);
  });

  it('leaves modules that document no API entry alone', async () => {
    const output = await generate([
      createEntry('guide', 1, 'About this documentation'),
      createEntry('guide', 2, 'Contributing'),
      createEntry('guide', 2, 'Stability index'),
      createEntry('guide', 3, 'Stability overview'),
    ]);

    assert.equal(output.length, 4);
  });

  it('re-targets links authored for the module page', async () => {
    const input = createModule();
    const readFile = input[2];

    readFile.content.children.push(
      link('#file-descriptors'), // same chunk
      link('#class-fsdir'), // another chunk
      link('#file-system'), // only on the full page
      link('net.html#foo'), // relative to the module's directory
      link('/absolute.html'),
      link('https://example.com')
    );

    const output = await generate(input);
    const chunk = output.find(e => e.path === '/fs/readFile');

    assert.deepEqual(
      chunk.content.children.slice(2).map(p => p.children[0].url),
      [
        '#file-descriptors',
        'Dir.html#class-fsdir',
        '../fs.html#file-system',
        '../net.html#foo',
        '/absolute.html',
        'https://example.com',
      ]
    );

    // The full page keeps its own links
    assert.equal(readFile.content.children[3].children[0].url, '#class-fsdir');
  });

  it('never splits excluded modules', async () => {
    getConfig('chunked').exclude = ['fs'];

    try {
      assert.equal((await generate(createModule())).length, 6);
    } finally {
      getConfig('chunked').exclude = [];
    }
  });

  it('honours maxDepth', async () => {
    getConfig('chunked').maxDepth = 2;

    try {
      const output = await generate(createModule());

      assert.deepEqual(
        output.filter(e => e.chunk && e.heading.depth === 1).map(e => e.path),
        ['/fs/callback-api', '/fs/Dir']
      );
    } finally {
      getConfig('chunked').maxDepth = 3;
    }
  });
});
