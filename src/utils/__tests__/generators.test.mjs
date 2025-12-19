import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  groupNodesByModule,
  getVersionFromSemVer,
  coerceSemVer,
  getCompatibleVersions,
  sortChanges,
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

describe('sortChanges', () => {
  it('sorts changes by version', () => {
    const changes = [
      { version: '18.5.0' },
      { version: '16.2.0' },
      { version: '20.1.0' },
    ];

    const result = sortChanges(changes);
    assert.equal(result[0].version, '20.1.0');
    assert.equal(result[1].version, '18.5.0');
    assert.equal(result[2].version, '16.2.0');
  });

  it('handles array versions', () => {
    const changes = [
      { version: ['18.5.0', '18.4.0'] },
      { version: ['16.2.0'] },
    ];

    const result = sortChanges(changes);
    assert.equal(result[0].version[0], '18.5.0');
    assert.equal(result[1].version[0], '16.2.0');
  });

  it('sorts by custom key', () => {
    const changes = [{ customVersion: '18.0.0' }, { customVersion: '16.0.0' }];

    const result = sortChanges(changes, 'customVersion');
    assert.equal(result[0].customVersion, '18.0.0');
    assert.equal(result[1].customVersion, '16.0.0');
  });
});
