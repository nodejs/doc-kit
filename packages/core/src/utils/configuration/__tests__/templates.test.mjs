'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GITHUB_EDIT_URL,
  getEditableRef,
  populate,
  populateEditURL,
} from '../templates.mjs';

describe('populate', () => {
  it('should substitute template variables from config', () => {
    const result = populate('https://github.com/{repository}/blob/{ref}/', {
      repository: 'nodejs/node',
      ref: 'main',
    });
    assert.strictEqual(result, 'https://github.com/nodejs/node/blob/main/');
  });

  it('should use fallback when config value is missing', () => {
    const result = populate('{name|unknown}', {});
    assert.strictEqual(result, 'unknown');
  });

  it('should leave the placeholder as-is when no value or fallback', () => {
    const result = populate('{missing}', {});
    assert.strictEqual(result, '{missing}');
  });
});

describe('getEditableRef', () => {
  it('should keep a branch name', () => {
    for (const branch of ['main', 'v24.x', 'v24.x-staging', 'feat/edit-url']) {
      assert.strictEqual(getEditableRef(branch), branch);
    }
  });

  it('should strip the refs/heads/ prefix from a branch', () => {
    assert.strictEqual(getEditableRef('refs/heads/v24.x'), 'v24.x');
  });

  it('should fall back to main when there is no ref', () => {
    assert.strictEqual(getEditableRef(undefined), 'main');
    assert.strictEqual(getEditableRef(''), 'main');
  });

  it('should fall back to main for HEAD and revisions relative to it', () => {
    for (const ref of ['HEAD', 'HEAD~1', 'HEAD^', 'HEAD~2^1']) {
      assert.strictEqual(getEditableRef(ref), 'main', ref);
    }
  });

  it('should fall back to main for commit SHAs', () => {
    for (const ref of [
      '933cb11',
      '933cb117c91',
      '933cb117c91e0c1f2a2b7e3c3f5d1a8b9c0d1e2f',
      '933cb117c91e0c1f2a2b7e3c3f5d1a8b9c0d1e2f933cb117c91e0c1f2a2b7e3c',
    ]) {
      assert.strictEqual(getEditableRef(ref), 'main', ref);
    }
  });

  it('should fall back to main for tags', () => {
    for (const ref of [
      'v24.0.0',
      '24.0.0',
      'v27.0.0-alpha.1',
      'refs/tags/v24.0.0',
      'refs/tags/some-tag',
    ]) {
      assert.strictEqual(getEditableRef(ref), 'main', ref);
    }
  });
});

describe('populateEditURL', () => {
  const template = `${GITHUB_EDIT_URL}/doc/api{path}.md`;

  it('should not link to HEAD, which GitHub cannot edit', () => {
    const result = populateEditURL(template, {
      repository: 'nodejs/node',
      ref: 'HEAD',
      path: '/buffer',
    });
    assert.strictEqual(
      result,
      'https://github.com/nodejs/node/edit/main/doc/api/buffer.md'
    );
  });

  it('should keep a configured branch', () => {
    const result = populateEditURL(template, {
      repository: 'nodejs/node',
      ref: 'v24.x',
      path: '/buffer',
    });
    assert.strictEqual(
      result,
      'https://github.com/nodejs/node/edit/v24.x/doc/api/buffer.md'
    );
  });
});
