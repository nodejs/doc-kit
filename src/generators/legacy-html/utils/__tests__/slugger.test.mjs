'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLegacySlugger } from '../slugger.mjs';

describe('createLegacySlugger', () => {
  it('prefixes with api stem and uses underscores', () => {
    const slugger = createLegacySlugger();
    assert.strictEqual(
      slugger.getLegacySlug('File System', 'fs'),
      'fs_file_system'
    );
  });

  it('replaces special characters with underscores', () => {
    const slugger = createLegacySlugger();
    assert.strictEqual(
      slugger.getLegacySlug('fs.readFile(path)', 'fs'),
      'fs_fs_readfile_path'
    );
  });

  it('strips leading and trailing underscores', () => {
    const slugger = createLegacySlugger();
    assert.strictEqual(slugger.getLegacySlug('Hello', 'fs'), 'fs_hello');
  });

  it('prefixes with underscore when result starts with non-alpha', () => {
    const slugger = createLegacySlugger();
    assert.strictEqual(
      slugger.getLegacySlug('123 test', '0num'),
      '_0num_123_test'
    );
  });

  it('deduplicates with a counter for identical titles', () => {
    const slugger = createLegacySlugger();
    assert.strictEqual(slugger.getLegacySlug('Hello', 'fs'), 'fs_hello');
    assert.strictEqual(slugger.getLegacySlug('Hello', 'fs'), 'fs_hello_1');
    assert.strictEqual(slugger.getLegacySlug('Hello', 'fs'), 'fs_hello_2');
    assert.strictEqual(slugger.getLegacySlug('World', 'fs'), 'fs_world');
  });
});
