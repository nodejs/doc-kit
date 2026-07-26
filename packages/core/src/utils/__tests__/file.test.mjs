'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withExt } from '../file.mjs';

describe('withExt', () => {
  it('should replace an existing extension', () => {
    assert.strictEqual(withExt('file.md', 'html'), 'file.html');
    assert.strictEqual(withExt('path/to/file.md', 'json'), 'path/to/file.json');
  });

  it('should add an extension when there is none', () => {
    assert.strictEqual(withExt('file', 'html'), 'file.html');
  });

  it('should strip the extension when ext is empty', () => {
    assert.strictEqual(withExt('file.md', ''), 'file');
    assert.strictEqual(withExt('file.md'), 'file');
  });

  it('should handle files with multiple dots', () => {
    assert.strictEqual(withExt('file.test.mjs', 'js'), 'file.test.js');
  });
});
