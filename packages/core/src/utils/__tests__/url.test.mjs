'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { relative } from '../url.mjs';

describe('relative', () => {
  it('should return absolute URLs unchanged', () => {
    assert.strictEqual(
      relative('https://example.com/a', '/fs'),
      'https://example.com/a'
    );
  });

  it('should resolve siblings from a top-level page', () => {
    assert.strictEqual(relative('/http', '/fs'), 'http');
    assert.strictEqual(relative('/orama-db.json', '/index'), 'orama-db.json');
  });

  it('should resolve a nested page from a top-level page', () => {
    assert.strictEqual(relative('/generators/web', '/index'), 'generators/web');
  });

  it('should resolve siblings within the same directory', () => {
    assert.strictEqual(relative('/generators/web', '/generators/ast'), 'web');
  });

  it('should resolve a top-level page from a nested page', () => {
    assert.strictEqual(
      relative('/getting-started', '/generators/web'),
      '../getting-started'
    );
    assert.strictEqual(
      relative('/orama-db.json', '/generators/web'),
      '../orama-db.json'
    );
  });

  it('should not consume the target itself as a common directory', () => {
    // `to` is a path prefix of `from`: the final segment names the target
    // page, not a directory, so it must survive into the result.
    assert.strictEqual(relative('/fs', '/fs/promises'), '../fs');
    assert.strictEqual(
      relative('/generators', '/generators/web'),
      '../generators'
    );
    assert.strictEqual(relative('/a/b', '/a/b/c'), '../b');
    assert.strictEqual(relative('/x', '/x/y/z'), '../../x');
  });

  it('should resolve the root', () => {
    assert.strictEqual(relative('/', '/index'), '.');
    assert.strictEqual(relative('/', '/generators/web'), '..');
  });
});
