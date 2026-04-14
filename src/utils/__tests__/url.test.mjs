import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { relative } from '../url.mjs';

describe('url util', () => {
  describe('relative()', () => {
    it('returns the same URL if it includes a protocol', () => {
      assert.equal(
        relative('https://example.com', '/foo/bar'),
        'https://example.com'
      );
      assert.equal(
        relative('http://nodejs.org', '/foo/bar'),
        'http://nodejs.org'
      );
    });

    it('returns the same URL if it starts with a hash fragment', () => {
      assert.equal(relative('#fragment', '/foo/index.html'), '#fragment');
    });

    it('returns the same URL if it starts with a query string', () => {
      assert.equal(relative('?query=true', '/foo/index.html'), '?query=true');
    });

    it('returns the relative path between two URLs', () => {
      assert.equal(relative('/api/fs.html', '/api/crypto.html'), 'fs.html');
      assert.equal(
        relative('/api/fs.html#slug', '/api/fs.html'),
        'fs.html#slug'
      );
      assert.equal(
        relative('/foo/bar.html', '/baz/qux.html'),
        '../foo/bar.html'
      );
      assert.equal(
        relative('/foo/bar.html', '/foo/bar/baz.html'),
        '../bar.html'
      );
      assert.equal(relative('/a/b/c.html', '/x/y/z.html'), '../../a/b/c.html');
    });
  });
});
