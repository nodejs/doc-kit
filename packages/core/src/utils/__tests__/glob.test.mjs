'use strict';

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { findFiles, globParent } from '../glob.mjs';

describe('findFiles', () => {
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'doc-kit-glob-'));
    mkdirSync(join(root, 'api', 'nested.md'), { recursive: true });
    writeFileSync(join(root, 'api', 'fs.md'), '');
    writeFileSync(join(root, 'api', 'path.md'), '');
    writeFileSync(join(root, 'api', 'quic.md'), '');
    writeFileSync(join(root, 'api', 'nested.md', 'deep.md'), '');
  });

  after(() => rmSync(root, { recursive: true, force: true }));

  it('should return matching files relative to cwd, without directories', () => {
    assert.deepStrictEqual(findFiles('api/*.md', { cwd: root }).sort(), [
      'api/fs.md',
      'api/path.md',
      'api/quic.md',
    ]);
  });

  it('should leave out ignored files', () => {
    assert.deepStrictEqual(
      findFiles('api/*.md', { cwd: root, ignore: ['api/quic.md'] }).sort(),
      ['api/fs.md', 'api/path.md']
    );
  });

  it('should return absolute patterns relative to cwd', () => {
    assert.deepStrictEqual(
      findFiles(`${root.split('\\').join('/')}/api/fs.md`, { cwd: root }),
      ['api/fs.md']
    );
  });

  it('should accept a URL as cwd', () => {
    assert.deepStrictEqual(
      findFiles('*.md', { cwd: pathToFileURL(join(root, 'api')) }).sort(),
      ['fs.md', 'path.md', 'quic.md']
    );
  });
});

describe('globParent', () => {
  it('should return the directory before the first glob segment', () => {
    assert.strictEqual(globParent('doc/api/*.md'), 'doc/api');
    assert.strictEqual(globParent('./doc/api/*.md'), './doc/api');
    assert.strictEqual(globParent('/root/*.js'), '/root');
    assert.strictEqual(globParent('lib/**/*.js'), 'lib');
    assert.strictEqual(globParent('a/{b,c}/*.md'), 'a');
    assert.strictEqual(globParent('a/b/[x-y]*.md'), 'a/b');
    assert.strictEqual(globParent('a/+(b|c)/*.md'), 'a');
    assert.strictEqual(globParent('a/b?d/*.md'), 'a');
  });

  it('should treat as plain what fs.globSync matches literally', () => {
    assert.strictEqual(globParent('a/(b|c)/*.md'), 'a/(b|c)');
    assert.strictEqual(globParent('a/b+c/*.md'), 'a/b+c');
  });

  it('should read backslashes as separators, like fs.globSync', () => {
    assert.strictEqual(globParent('doc\\api\\*.md'), 'doc/api');
    assert.strictEqual(globParent('C:\\docs\\*.md'), 'C:/docs');
  });

  it('should return the parent directory of a plain path', () => {
    assert.strictEqual(globParent('doc/api/fs.md'), 'doc/api');
  });

  it('should fall back to the current or root directory', () => {
    assert.strictEqual(globParent('*.md'), '.');
    assert.strictEqual(globParent('/*.md'), '/');
  });
});
