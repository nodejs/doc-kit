import assert from 'node:assert/strict';
import { describe, it, mock, afterEach } from 'node:test';

import {
  groupNodesByModule,
  getVersionFromSemVer,
  coerceSemVer,
  getCompatibleVersions,
  legacyToJSON,
  buildApiDocURL,
  createLazyGenerator,
} from '../generators.mjs';

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

describe('legacyToJSON', () => {
  const base = {
    type: 'module',
    source: 'lib/fs.js',
    introduced_in: 'v0.10.0',
    meta: {},
    stability: 2,
    stabilityText: 'Stable',
    classes: [],
    methods: ['readFile'],
    properties: [],
    miscs: [],
    modules: ['fs'],
    globals: [],
  };

  it('serialises a normal section with all keys', () => {
    const result = JSON.parse(legacyToJSON({ ...base, api: 'fs' }));
    assert.ok('type' in result);
    assert.ok('methods' in result);
    assert.ok('modules' in result);
  });

  it('omits modules key for index sections', () => {
    const result = JSON.parse(legacyToJSON({ ...base, api: 'index' }));
    assert.ok(!('modules' in result));
  });

  it('uses all.json key order when api is null', () => {
    const result = JSON.parse(legacyToJSON({ ...base, api: null }));
    // all.json only includes miscs, modules, classes, globals, methods
    assert.ok('miscs' in result);
    assert.ok('modules' in result);
    assert.ok(!('type' in result));
    assert.ok(!('source' in result));
  });

  it('passes extra args to JSON.stringify (e.g. indentation)', () => {
    const result = legacyToJSON({ ...base, api: 'fs' }, null, 2);
    assert.ok(result.includes('\n'));
  });
});

describe('buildApiDocURL', () => {
  const entry = { api: 'fs' };
  const base = 'https://nodejs.org';

  it('builds a .md URL by default', () => {
    const url = buildApiDocURL(entry, base);
    assert.ok(url instanceof URL);
    assert.ok(url.pathname.endsWith('.md'));
    assert.ok(url.pathname.includes('/fs'));
  });

  it('builds a .html URL when useHtml is true', () => {
    const url = buildApiDocURL(entry, base, true);
    assert.ok(url.pathname.endsWith('.html'));
  });
});

describe('createLazyGenerator', () => {
  afterEach(() => mock.restoreAll());

  it('spreads metadata properties onto the returned object', () => {
    const metadata = { name: 'ast', version: '1.0.0', dependsOn: undefined };
    const gen = createLazyGenerator(metadata);
    assert.equal(gen.name, 'ast');
    assert.equal(gen.version, '1.0.0');
  });

  it('exposes generate and processChunk functions that delegate to the lazily loaded module', async () => {
    // Both exports are mocked in a single mock.module() call to avoid ESM import
    // cache collisions that occur when re-mocking the same specifier across two it() blocks.
    const specifier = import.meta.resolve('../../generators/ast/generate.mjs');
    const fakeGenerate = async input => `processed:${input}`;
    const fakeProcessChunk = async (input, indices) =>
      indices.map(i => input[i]);
    mock.module(specifier, {
      namedExports: { generate: fakeGenerate, processChunk: fakeProcessChunk },
    });

    const gen = createLazyGenerator({ name: 'ast' });

    const generateResult = await gen.generate('hello');
    assert.equal(generateResult, 'processed:hello');

    const processChunkResult = await gen.processChunk(['a', 'b', 'c'], [0, 2]);
    assert.deepStrictEqual(processChunkResult, ['a', 'c']);
  });
});
