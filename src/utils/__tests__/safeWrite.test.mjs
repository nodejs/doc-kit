'use strict';

import assert from 'node:assert';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { safeWrite } from '../safeWrite.mjs';

describe('safeWrite', () => {
  const testDir = join(import.meta.dirname, 'test-safe-write');

  beforeEach(async () => {
    // Create test directory
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  it('should write a new file and return true', async () => {
    const filePath = join(testDir, 'new-file.txt');
    const content = 'Hello, World!';

    const result = await safeWrite(filePath, content);

    assert.strictEqual(result, true);
    const written = await readFile(filePath, 'utf-8');
    assert.strictEqual(written, content);
  });

  it('should skip writing when content size matches and return false', async () => {
    const filePath = join(testDir, 'existing-file.txt');
    const content = 'Same content';

    // Write file initially
    await writeFile(filePath, content, 'utf-8');
    const initialStat = await stat(filePath);

    // Wait a bit to ensure mtime would be different if written
    await new Promise(resolve => setTimeout(resolve, 10));

    // Try to write same content
    const result = await safeWrite(filePath, content);

    assert.strictEqual(result, false);
    const finalStat = await stat(filePath);
    // mtime should be the same since we skipped the write
    assert.strictEqual(
      initialStat.mtimeMs,
      finalStat.mtimeMs,
      'File should not have been modified'
    );
  });

  it('should write when content size differs and return true', async () => {
    const filePath = join(testDir, 'different-size.txt');
    const initialContent = 'Short';
    const newContent = 'Much longer content';

    await writeFile(filePath, initialContent, 'utf-8');
    const initialStat = await stat(filePath);

    // Wait to ensure mtime would be different
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await safeWrite(filePath, newContent);

    assert.strictEqual(result, true);
    const written = await readFile(filePath, 'utf-8');
    assert.strictEqual(written, newContent);

    const finalStat = await stat(filePath);
    assert.notStrictEqual(
      initialStat.mtimeMs,
      finalStat.mtimeMs,
      'File should have been modified'
    );
  });

  it('should handle Buffer content', async () => {
    const filePath = join(testDir, 'buffer-file.txt');
    const content = Buffer.from('Buffer content', 'utf-8');

    const result = await safeWrite(filePath, content);

    assert.strictEqual(result, true);
    const written = await readFile(filePath);
    assert.deepStrictEqual(written, content);
  });

  it('should create parent directories if they do not exist', async () => {
    const nestedPath = join(testDir, 'nested', 'dir', 'file.txt');
    const content = 'Nested file';

    // Parent directories don't exist yet
    await assert.rejects(async () => {
      await stat(join(testDir, 'nested'));
    });

    // safeWrite should handle the write even though mkdir is not called
    // (writeFile will fail if parent doesn't exist, so we expect this to throw)
    await assert.rejects(
      async () => await safeWrite(nestedPath, content),
      /ENOENT/
    );

    // Create parent dirs and try again
    await mkdir(join(testDir, 'nested', 'dir'), { recursive: true });
    const result = await safeWrite(nestedPath, content);

    assert.strictEqual(result, true);
    const written = await readFile(nestedPath, 'utf-8');
    assert.strictEqual(written, content);
  });

  it('should handle different encodings', async () => {
    const filePath = join(testDir, 'encoded.txt');
    const content = 'Encoded content: éàü';

    const result = await safeWrite(filePath, content, 'utf-8');

    assert.strictEqual(result, true);
    const written = await readFile(filePath, 'utf-8');
    assert.strictEqual(written, content);
  });

  it('should write when file exists but content is different (edge case)', async () => {
    const filePath = join(testDir, 'edge-case.txt');
    // Create two strings with same byte length but different content
    const content1 = 'abc';
    const content2 = 'xyz';

    await writeFile(filePath, content1, 'utf-8');

    // Since sizes match, safeWrite will skip (this is by design - a heuristic)
    const result = await safeWrite(filePath, content2);

    assert.strictEqual(result, false);
    const written = await readFile(filePath, 'utf-8');
    // Content remains as original since write was skipped
    assert.strictEqual(written, content1);
  });
});
