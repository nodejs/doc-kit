import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLegacySlugger } from '../slugger.mjs';

describe('createLegacySlugger', () => {
  it('generates prefix_slug format', () => {
    const slug = createLegacySlugger();
    assert.strictEqual(slug('File System', 'fs'), 'fs_file_system');
  });

  it('strips special characters', () => {
    const slug = createLegacySlugger();
    assert.strictEqual(slug('fs.readFile()', 'fs'), 'fs_fs_readfile');
  });

  it('deduplicates repeated slugs with counter suffix', () => {
    const slug = createLegacySlugger();
    assert.strictEqual(slug('File System', 'fs'), 'fs_file_system');
    assert.strictEqual(slug('File System', 'fs'), 'fs_file_system_1');
    assert.strictEqual(slug('File System', 'fs'), 'fs_file_system_2');
  });

  it('each slugger instance has independent state', () => {
    const slug1 = createLegacySlugger();
    const slug2 = createLegacySlugger();
    slug1('File System', 'fs');
    assert.strictEqual(slug2('File System', 'fs'), 'fs_file_system');
  });

  it('prevents slugs from starting with a digit', () => {
    const slug = createLegacySlugger();
    const result = slug('123abc', 'fs');
    assert.match(result, /^[^0-9]/);
  });

  it('handles empty text gracefully', () => {
    const slug = createLegacySlugger();
    assert.strictEqual(slug('', 'fs'), 'fs_section');
  });

  it('trims whitespace from text before generating slug', () => {
    const slug = createLegacySlugger();
    assert.strictEqual(slug('  readFile  ', 'fs'), 'fs_readfile');
  });

  it('collapses multiple special characters into single underscores', () => {
    const slug = createLegacySlugger();
    assert.strictEqual(slug('read---file!!!', 'fs'), 'fs_read_file');
  });
});
