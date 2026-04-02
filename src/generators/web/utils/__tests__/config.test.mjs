import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { SemVer } from 'semver';

import { setConfig } from '../../../../utils/configuration/index.mjs';

mock.module('@node-core/rehype-shiki', {
  namedExports: {
    LANGS: [
      { name: 'javascript', aliases: ['js'], displayName: 'JavaScript' },
      { name: 'typescript', aliases: ['ts'], displayName: 'TypeScript' },
      { name: 'python', displayName: 'Python' },
    ],
  },
});

const { buildVersionEntries, buildPageList, buildLanguageDisplayNameMap } =
  await import('../config.mjs');

await setConfig({
  version: 'v22.0.0',
  changelog: [
    { version: new SemVer('20.0.0'), isLts: true, isCurrent: false },
    { version: new SemVer('22.0.0'), isLts: false, isCurrent: true },
  ],
  generators: {
    web: {
      title: 'Node.js',
      repository: 'nodejs/node',
      ref: 'main',
      baseURL: 'https://nodejs.org/docs',
      editURL: 'https://github.com/nodejs/node/edit/main/doc/api{path}.md',
      pageURL: '{baseURL}/latest-{version}/api{path}.html',
    },
  },
});

/**
 * Helper to create a minimal JSX content entry.
 */
const makeEntry = (api, name, path) => ({
  data: {
    api,
    path,
    category: api === 'fs' ? 'File System' : undefined,
    heading: { depth: 1, data: { name } },
  },
});

describe('buildVersionEntries', () => {
  it('creates version entries with labels and URL templates', () => {
    const config = {
      changelog: [
        { version: new SemVer('20.0.0'), isLts: true, isCurrent: false },
        { version: new SemVer('22.0.0'), isLts: false, isCurrent: true },
      ],
    };

    const result = buildVersionEntries(
      config,
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
    const config = {
      changelog: [
        { version: new SemVer('18.0.0'), isLts: false, isCurrent: false },
      ],
    };

    const result = buildVersionEntries(config, '{version}');

    assert.equal(result[0].label, 'v18.x');
  });

  it('formats minor versions when minor is non-zero', () => {
    const config = {
      changelog: [
        { version: new SemVer('21.7.0'), isLts: false, isCurrent: false },
      ],
    };

    const result = buildVersionEntries(config, '{version}');

    assert.equal(result[0].label, 'v21.7.x');
    assert.equal(result[0].major, 21);
  });
});

describe('buildPageList', () => {
  it('returns sorted [name, path, category] tuples from input entries', () => {
    const input = [
      makeEntry('http', 'HTTP', '/http'),
      makeEntry('fs', 'File System', '/fs'),
    ];

    const result = buildPageList(input);

    assert.equal(result.length, 2);
    // Sorted alphabetically by name
    assert.deepStrictEqual(result[0], ['File System', '/fs', 'File System']);
    assert.deepStrictEqual(result[1], ['HTTP', '/http', undefined]);
  });

  it('filters out entries whose heading depth is not 1', () => {
    const input = [
      makeEntry('fs', 'File System', '/fs'),
      {
        data: {
          api: 'http',
          path: '/http',
          heading: { depth: 2, data: { name: 'HTTP' } },
        },
      },
    ];

    const result = buildPageList(input);

    assert.equal(result.length, 1);
    assert.deepStrictEqual(result[0], ['File System', '/fs', 'File System']);
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
