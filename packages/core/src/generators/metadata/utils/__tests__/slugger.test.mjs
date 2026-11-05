'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import createNodeSlugger, { slug } from '../slugger.mjs';

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
    it('preserves underscores', () => {
      assert.strictEqual(slug('foo_bar', identity), 'foo_bar');
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

  describe('hyphens', () => {
    it('preserves leading hyphens', () => {
      assert.strictEqual(slug('-foo', identity), '-foo');
      assert.strictEqual(slug('--permission', identity), '--permission');
    });

    it('preserves trailing hyphens', () => {
      assert.strictEqual(slug('foo--', identity), 'foo--');
    });

    it('preserves consecutive hyphens', () => {
      assert.strictEqual(slug('foo--bar', identity), 'foo--bar');
    });

    it('preserves an all-hyphen string', () => {
      assert.strictEqual(slug('---', identity), '---');
    });
  });

  describe('legacy Node.js anchors', () => {
    it('matches the anchors of the old doc tooling', () => {
      assert.strictEqual(slug('`-c`, `--check`'), '-c---check');
      assert.strictEqual(
        slug('DEP0147: `fs.rmdir(path, { recursive: true })`'),
        'dep0147-fsrmdirpath--recursive-true-'
      );
      assert.strictEqual(
        slug('Stability & Deprecation'),
        'stability--deprecation'
      );
    });
  });

  describe('integration with github-slugger', () => {
    it('lowercases and hyphenates a plain title', () => {
      assert.strictEqual(slug('Hello World'), 'hello-world');
    });

    it('preserves underscores in module names', () => {
      assert.strictEqual(slug('child_process'), 'child_process');
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
