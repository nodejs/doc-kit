import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getEntryDescription,
  groupNodesByModule,
  getVersionFromSemVer,
  coerceSemVer,
  getCompatibleVersions,
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
