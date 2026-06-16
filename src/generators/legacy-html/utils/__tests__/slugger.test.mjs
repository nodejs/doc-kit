'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLegacySlugger } from '../slugger.mjs';

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

  describe('deprecation headings', () => {
    it('returns the DEP code for a deprecation heading', () => {
      const getLegacySlug = createLegacySlugger();
      assert.strictEqual(
        getLegacySlug(
          'DEP0001: `http.OutgoingMessage.prototype.flush`',
          'deprecations'
        ),
        'DEP0001'
      );
    });

    it('returns the DEP code regardless of the description text', () => {
      const getLegacySlug = createLegacySlugger();
      assert.strictEqual(
        getLegacySlug(
          'DEP0190: spawning .bat and .cmd files with child_process.spawn() with shell option',
          'deprecations'
        ),
        'DEP0190'
      );
    });
  });
});
