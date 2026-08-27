import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { SemVer } from 'semver';

mock.module('@node-core/rehype-shiki', {
  namedExports: {
    LANGS: [
      { name: 'javascript', aliases: ['js'], displayName: 'JavaScript' },
      { name: 'typescript', aliases: ['ts'], displayName: 'TypeScript' },
      { name: 'python', displayName: 'Python' },
    ],
  },
});

const {
  default: createConfigSource,
  buildVersionEntries,
  buildPageList,
  buildChunkGroups,
  buildDocumentationIndex,
  buildLanguageDisplayNameMap,
} = await import('../config.mjs');

const config = await setConfig({
  version: 'v22.0.0',
  changelog: [
    { version: new SemVer('20.0.0'), isLts: true, isCurrent: false },
    { version: new SemVer('22.0.0'), isLts: false, isCurrent: true },
  ],
});

// Loading the real `html` generator would pull in the full rendering stack
// (which the `rehype-shiki` mock above cannot satisfy), so its resolved
// configuration is stubbed in directly.
config.html = {
  ...config.global,
  title: 'Node.js',
  repository: 'nodejs/node',
  ref: 'main',
  baseURL: 'https://nodejs.org/docs',
  editURL: 'https://github.com/nodejs/node/edit/main/doc/api{path}.md',
  pageURL: '{baseURL}/latest-{version}/api{path}.html',
  navigation: {},
};

/**
 * Helper to create a minimal page metadata entry.
 */
const makeEntry = (api, name, path, extra = {}) => ({
  api,
  path,
  heading: { depth: 1, data: { name } },
  ...extra,
});

describe('buildVersionEntries', () => {
  it('creates version entries with labels and URL templates', () => {
    const result = buildVersionEntries(
      [
        { version: new SemVer('20.0.0'), isLts: true, isCurrent: false },
        { version: new SemVer('22.0.0'), isLts: false, isCurrent: true },
      ],
      'https://nodejs.org/docs/latest-{version}/api{path}.html'
    );

    assert.equal(result.length, 2);
    assert.deepStrictEqual(result[0], {
      url: 'https://nodejs.org/docs/latest-v20.x/api{path}.html',
      label: 'v20.x (LTS)',
      major: 20,
    });
    assert.deepStrictEqual(result[1], {
      url: 'https://nodejs.org/docs/latest-v22.x/api{path}.html',
      label: 'v22.x (Current)',
      major: 22,
    });
  });

  it('does not append a label suffix for versions that are neither LTS nor Current', () => {
    const result = buildVersionEntries(
      [{ version: new SemVer('18.0.0'), isLts: false, isCurrent: false }],
      '{version}'
    );

    assert.equal(result[0].label, 'v18.x');
  });

  it('formats minor versions when minor is non-zero', () => {
    const result = buildVersionEntries(
      [{ version: new SemVer('21.7.0'), isLts: false, isCurrent: false }],
      '{version}'
    );

    assert.equal(result[0].label, 'v21.7.x');
    assert.equal(result[0].major, 21);
  });
});

describe('buildPageList', () => {
  it('returns sorted [name, path] tuples from input entries', () => {
    const input = [
      makeEntry('http', 'HTTP', '/http'),
      makeEntry('fs', 'File System', '/fs'),
    ];

    const result = buildPageList(input);

    assert.equal(result.length, 2);
    // Sorted alphabetically by name
    assert.deepStrictEqual(result[0], ['File System', '/fs']);
    assert.deepStrictEqual(result[1], ['HTTP', '/http']);
  });

  it('filters out entries whose heading depth is not 1', () => {
    const input = [
      makeEntry('fs', 'File System', '/fs'),
      {
        api: 'http',
        path: '/http',
        heading: { depth: 2, data: { name: 'HTTP' } },
      },
    ];

    const result = buildPageList(input);

    assert.equal(result.length, 1);
    assert.deepStrictEqual(result[0], ['File System', '/fs']);
  });
});

describe('buildDocumentationIndex', () => {
  it('lists only pages with a stability index, with their descriptions', () => {
    const input = [
      {
        api: 'fs',
        path: '/fs',
        heading: { depth: 1, data: { name: 'File System' } },
        stability: { data: { index: '2' } },
        content: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'File system APIs.' }],
            },
          ],
        },
      },
      {
        api: 'index',
        path: '/index',
        heading: { depth: 1, data: { name: 'Index' } },
        stability: null,
        content: { type: 'root', children: [] },
      },
      {
        api: 'quic',
        path: '/quic',
        heading: { depth: 1, data: { name: 'QUIC' } },
        stability: { data: { index: '1.1' } },
        llm_description: 'QUIC protocol support.',
        content: { type: 'root', children: [] },
      },
    ];

    const result = buildDocumentationIndex(input);

    assert.deepStrictEqual(result, [
      {
        api: 'fs',
        name: 'File System',
        index: '2',
        description: 'File system APIs.',
      },
      {
        api: 'quic',
        name: 'QUIC',
        index: '1.1',
        description: 'QUIC protocol support.',
      },
    ]);
  });

  it('renders descriptions to HTML, without the links entries cannot nest', () => {
    const input = [
      {
        api: 'fs',
        path: '/fs',
        heading: { depth: 1, data: { name: 'File System' } },
        stability: { data: { index: '2' } },
        llm_description:
          'Enables interacting with the `file system`, see [fs](/fs).',
        content: { type: 'root', children: [] },
      },
    ];

    const [{ description }] = buildDocumentationIndex(input);

    assert.equal(
      description,
      'Enables interacting with the <code>file system</code>, see fs.'
    );
  });
});

describe('buildChunkGroups', () => {
  const chunk = (name, index, depth = 2, label = name) =>
    makeEntry(`fs-${name}`, name, `/fs/${name}`, {
      title: label,
      chunk: { api: 'fs', path: '/fs', slug: name, index, depth },
    });

  it('nests chunk pages under their module by depth, in document order', () => {
    const groups = buildChunkGroups([
      chunk('readFile', 2, 3, 'fs.readFile'),
      makeEntry('fs', 'File System', '/fs'),
      chunk('notes', 3, 2, 'Notes'),
      chunk('callback-api', 1, 2, 'Callback API'),
      makeEntry('http', 'HTTP', '/http'),
    ]);

    assert.deepStrictEqual(groups, {
      '/fs': {
        label: 'File System',
        items: [
          {
            label: 'Callback API',
            path: '/fs/callback-api',
            items: [{ label: 'fs.readFile', path: '/fs/readFile' }],
          },
          { label: 'Notes', path: '/fs/notes' },
        ],
      },
    });
  });

  it('returns no groups when nothing was chunked', () => {
    assert.deepStrictEqual(
      buildChunkGroups([makeEntry('fs', 'File System', '/fs')]),
      {}
    );
  });
});

describe('createConfigSource', () => {
  it('lists only real module pages, and exposes the chunk groups', () => {
    const source = createConfigSource([
      makeEntry('fs', 'File System', '/fs'),
      makeEntry('all', 'All', '/all', { synthetic: true }),
      makeEntry('fs-notes', 'Notes', '/fs/notes', {
        chunk: { api: 'fs', path: '/fs', slug: 'notes', index: 0, depth: 2 },
      }),
    ]);

    assert.match(source, /export const pages = \[\["File System","\/fs"\]\];/);
    assert.match(source, /export const chunks = \{"\/fs":/);
  });
});

describe('buildLanguageDisplayNameMap', () => {
  it('returns entries suitable for constructing a Map', () => {
    const result = buildLanguageDisplayNameMap();

    // Should have one entry per unique language name
    assert.equal(result.length, 3);

    const map = new Map(result);

    assert.equal(map.get('JavaScript'), undefined);
    // Each entry is [[aliases..., name], displayName]
    // Find the javascript entry
    const jsEntry = result.find(([keys]) => keys.includes('javascript'));
    assert.ok(jsEntry);
    assert.deepStrictEqual(jsEntry[0], ['js', 'javascript']);
    assert.equal(jsEntry[1], 'JavaScript');
  });

  it('handles languages without aliases', () => {
    const result = buildLanguageDisplayNameMap();

    const pyEntry = result.find(([keys]) => keys.includes('python'));
    assert.ok(pyEntry);
    assert.deepStrictEqual(pyEntry[0], ['python']);
    assert.equal(pyEntry[1], 'Python');
  });
});
