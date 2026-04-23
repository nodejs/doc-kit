'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLegacySlugger,
  buildHtmlTypeLink,
  buildStabilityOverview,
} from '../content.mjs';

describe('createLegacySlugger', () => {
  it('prefixes with api stem and uses underscores', () => {
    const getLegacySlug = createLegacySlugger();
    assert.strictEqual(getLegacySlug('File System', 'fs'), 'fs_file_system');
  });

  it('replaces special characters with underscores', () => {
    const getLegacySlug = createLegacySlugger();
    assert.strictEqual(
      getLegacySlug('fs.readFile(path)', 'fs'),
      'fs_fs_readfile_path'
    );
  });

  it('strips leading and trailing underscores', () => {
    const getLegacySlug = createLegacySlugger();
    assert.strictEqual(getLegacySlug('Hello', 'fs'), 'fs_hello');
  });

  it('prefixes with underscore when result starts with non-alpha', () => {
    const getLegacySlug = createLegacySlugger();
    assert.strictEqual(getLegacySlug('123 test', '0num'), '_0num_123_test');
  });

  it('deduplicates with a counter for identical titles', () => {
    const getLegacySlug = createLegacySlugger();
    assert.strictEqual(getLegacySlug('Hello', 'fs'), 'fs_hello');
    assert.strictEqual(getLegacySlug('Hello', 'fs'), 'fs_hello_1');
    assert.strictEqual(getLegacySlug('Hello', 'fs'), 'fs_hello_2');
    assert.strictEqual(getLegacySlug('World', 'fs'), 'fs_world');
  });
});

describe('buildHtmlTypeLink', () => {
  it('leaves unrelated html values untouched', () => {
    const node = { value: '<p>no types here</p>' };
    buildHtmlTypeLink(node);
    assert.strictEqual(node.value, '<p>no types here</p>');
  });
});

describe('buildStabilityOverview', () => {
  it('skips entries without a stability entry', () => {
    const table = buildStabilityOverview([
      { api: 'fs', heading: { data: {} } },
    ]);
    const tbody = table.children.find(c => c.tagName === 'tbody');
    assert.deepStrictEqual(tbody.children, []);
  });

  it('renders a row per head node that has stability info', () => {
    const table = buildStabilityOverview([
      {
        api: 'fs',
        heading: { data: { name: 'File System' } },
        stability: {
          data: { index: '2', description: 'Stable. Safe to use.' },
        },
      },
    ]);
    const tbody = table.children.find(c => c.tagName === 'tbody');
    assert.strictEqual(tbody.children.length, 1);
    const [moduleCell, stabilityCell] = tbody.children[0].children;
    assert.ok(moduleCell.properties.className.includes('module_stability'));
    assert.ok(
      stabilityCell.properties.className.includes('api_stability_2'),
      'should include parsed stability index class'
    );
  });
});
