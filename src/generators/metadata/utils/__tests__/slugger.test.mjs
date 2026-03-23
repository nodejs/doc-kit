'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import createNodeSlugger, { slug, getLegacySlug } from '../slugger.mjs';

const identity = str => str;

describe('slug', () => {
  describe('node.js replacement', () => {
    it('replaces "node.js" with "nodejs"', () => {
      assert.strictEqual(slug('node.js', identity), 'nodejs');
    });

    it('is case-insensitive', () => {
      assert.strictEqual(slug('Node.JS', identity), 'nodejs');
    });
  });

  describe('ampersand replacement', () => {
    it('replaces & with -and-', () => {
      assert.strictEqual(slug('a&b', identity), 'a-and-b');
    });
  });

  describe('special character to hyphen replacement', () => {
    it('replaces underscores with hyphens', () => {
      assert.strictEqual(slug('foo_bar', identity), 'foo-bar');
    });

    it('replaces forward slashes with hyphens', () => {
      assert.strictEqual(slug('foo/bar', identity), 'foo-bar');
    });

    it('replaces colons with hyphens', () => {
      assert.strictEqual(slug('foo:bar', identity), 'foo-bar');
    });

    it('replaces commas with hyphens', () => {
      assert.strictEqual(slug('foo,bar', identity), 'foo-bar');
    });

    it('replaces semicolons with hyphens', () => {
      assert.strictEqual(slug('foo;bar', identity), 'foo-bar');
    });
  });

  describe('leading hyphen removal', () => {
    it('removes a single leading hyphen', () => {
      assert.strictEqual(slug('-foo', identity), 'foo');
    });

    it('removes multiple leading hyphens', () => {
      assert.strictEqual(slug('--foo', identity), 'foo');
    });

    it('preserves an all-hyphen string', () => {
      assert.strictEqual(slug('---', identity), '---');
    });
  });

  describe('trailing hyphen removal', () => {
    it('removes a single trailing hyphen', () => {
      assert.strictEqual(slug('foo-', identity), 'foo');
    });

    it('removes multiple trailing hyphens', () => {
      assert.strictEqual(slug('foo--', identity), 'foo');
    });
  });

  describe('consecutive hyphen replacement', () => {
    it('replaces from start of string up to and including double-hyphen with a single hyphen', () => {
      assert.strictEqual(slug('foo--bar', identity), '-bar');
    });

    it('does not fire on an all-hyphen string', () => {
      assert.strictEqual(slug('---', identity), '---');
    });
  });

  describe('integration with github-slugger', () => {
    it('lowercases and hyphenates a plain title', () => {
      assert.strictEqual(slug('Hello World'), 'hello-world');
    });

    it('converts underscored names to hyphenated slugs', () => {
      assert.strictEqual(slug('child_process'), 'child-process');
    });

    it('handles titles with no special characters', () => {
      assert.strictEqual(slug('stability index'), 'stability-index');
    });
  });
});

describe('createNodeSlugger', () => {
  it('deduplicates the same slug by appending a counter', () => {
    const slugger = createNodeSlugger();
    assert.strictEqual(slugger.slug('Hello'), 'hello');
    assert.strictEqual(slugger.slug('Hello'), 'hello-1');
    assert.strictEqual(slugger.slug('Hello'), 'hello-2');
  });

  it('does not affect different titles', () => {
    const slugger = createNodeSlugger();
    assert.strictEqual(slugger.slug('First'), 'first');
    assert.strictEqual(slugger.slug('Second'), 'second');
  });

  it('each instance has independent state', () => {
    const slugger1 = createNodeSlugger();
    const slugger2 = createNodeSlugger();
    slugger1.slug('Hello');
    assert.strictEqual(slugger2.slug('Hello'), 'hello');
  });
});

describe('getLegacySlug', () => {
  it('prefixes with api stem and uses underscores', () => {
    assert.strictEqual(getLegacySlug('File System', 'fs'), 'fs_file_system');
  });

  it('replaces special characters with underscores', () => {
    assert.strictEqual(
      getLegacySlug('fs.readFile(path)', 'fs'),
      'fs_fs_readfile_path'
    );
  });

  it('strips leading and trailing underscores', () => {
    assert.strictEqual(getLegacySlug('Hello', 'fs'), 'fs_hello');
  });

  it('prefixes with underscore when result starts with non-alpha', () => {
    assert.strictEqual(getLegacySlug('123 test', '0num'), '_0num_123_test');
  });
});

describe('createNodeSlugger legacySlug', () => {
  it('deduplicates repeated legacy slugs with a counter', () => {
    const slugger = createNodeSlugger();
    assert.strictEqual(slugger.legacySlug('Hello', 'fs'), 'fs_hello');
    assert.strictEqual(slugger.legacySlug('Hello', 'fs'), 'fs_hello_1');
    assert.strictEqual(slugger.legacySlug('Hello', 'fs'), 'fs_hello_2');
  });

  it('does not deduplicate different titles', () => {
    const slugger = createNodeSlugger();
    assert.strictEqual(slugger.legacySlug('First', 'fs'), 'fs_first');
    assert.strictEqual(slugger.legacySlug('Second', 'fs'), 'fs_second');
  });
});
