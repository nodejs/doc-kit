import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { legacyToJSON } from '../legacyToJSON.mjs';

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
