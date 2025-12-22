import assert from 'node:assert/strict';
import { mkdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { safeCopy } from '../safeCopy.mjs';

describe('safeCopy', () => {
  const testDir = join(import.meta.dirname, 'test-safe-copy');
  const srcDir = join(testDir, 'src');
  const targetDir = join(testDir, 'target');

  beforeEach(async () => {
    // Create test directories
    await mkdir(srcDir, { recursive: true });
    await mkdir(targetDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directories
    await rm(testDir, { recursive: true, force: true });
  });

  it('should copy new files that do not exist in target', async () => {
    // Create a file in source
    await writeFile(join(srcDir, 'file1.txt'), 'content1');

    await safeCopy(srcDir, targetDir);

    // Verify file was copied
    const content = await readFile(join(targetDir, 'file1.txt'), 'utf-8');
    assert.strictEqual(content, 'content1');
  });

  it('should copy multiple files', async () => {
    // Create multiple files in source
    await writeFile(join(srcDir, 'file1.txt'), 'content1');
    await writeFile(join(srcDir, 'file2.txt'), 'content2');
    await writeFile(join(srcDir, 'file3.txt'), 'content3');

    await safeCopy(srcDir, targetDir);

    // Verify all files were copied
    const content1 = await readFile(join(targetDir, 'file1.txt'), 'utf-8');
    const content2 = await readFile(join(targetDir, 'file2.txt'), 'utf-8');
    const content3 = await readFile(join(targetDir, 'file3.txt'), 'utf-8');

    assert.strictEqual(content1, 'content1');
    assert.strictEqual(content2, 'content2');
    assert.strictEqual(content3, 'content3');
  });

  it('should skip files with same size and older modification time', async () => {
    // Create file in source with specific size
    const content = 'same content';
    await writeFile(join(srcDir, 'file1.txt'), content);

    // Make source file old
    const oldTime = new Date(Date.now() - 10000);
    await utimes(join(srcDir, 'file1.txt'), oldTime, oldTime);

    // Create target file with same size but different content and newer timestamp
    await writeFile(join(targetDir, 'file1.txt'), 'other things');

    await safeCopy(srcDir, targetDir);

    // Verify file was not overwritten (source is older)
    const targetContent = await readFile(join(targetDir, 'file1.txt'), 'utf-8');
    assert.strictEqual(targetContent, 'other things');
  });

  it('should copy files when source has newer modification time', async () => {
    // Create files in both directories
    await writeFile(join(srcDir, 'file1.txt'), 'new content');
    await writeFile(join(targetDir, 'file1.txt'), 'old content');

    // Make target file older
    const oldTime = new Date(Date.now() - 10000);
    await utimes(join(targetDir, 'file1.txt'), oldTime, oldTime);

    await safeCopy(srcDir, targetDir);

    // Verify file was updated
    const content = await readFile(join(targetDir, 'file1.txt'), 'utf-8');
    assert.strictEqual(content, 'new content');
  });

  it('should copy files when sizes differ', async () => {
    // Create files with different sizes
    await writeFile(join(srcDir, 'file1.txt'), 'short');
    await writeFile(join(targetDir, 'file1.txt'), 'much longer content');

    await safeCopy(srcDir, targetDir);

    // Verify file was updated
    const content = await readFile(join(targetDir, 'file1.txt'), 'utf-8');
    assert.strictEqual(content, 'short');
  });

  it('should handle empty source directory', async () => {
    // Don't create any files in source
    await safeCopy(srcDir, targetDir);
  });

  it('should copy files with same size but different content when mtime is newer', async () => {
    // Create files with same size but different content
    await writeFile(join(srcDir, 'file1.txt'), 'abcde');
    await writeFile(join(targetDir, 'file1.txt'), 'fghij');

    // Make target older
    const oldTime = new Date(Date.now() - 10000);
    await utimes(join(targetDir, 'file1.txt'), oldTime, oldTime);

    await safeCopy(srcDir, targetDir);

    // Verify file was updated with source content
    const content = await readFile(join(targetDir, 'file1.txt'), 'utf-8');
    assert.strictEqual(content, 'abcde');
  });
});
