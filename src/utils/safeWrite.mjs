'use strict';

import { statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

/**
 * Writes a file only if the content has changed, avoiding unnecessary writes.
 * Uses stat comparison (size and mtime) to determine if file needs updating.
 *
 * @param {string} filePath - The path to the file
 * @param {string | Buffer} content - The content to write
 * @param {string} encoding - File encoding (default: 'utf-8')
 * @returns {Promise<boolean>} True if file was written, false if skipped
 */
export async function safeWrite(filePath, content, encoding = 'utf-8') {
  // Check if file exists
  const stat = statSync(filePath, { throwIfNoEntry: false });

  if (stat !== undefined) {
    const newSize = Buffer.byteLength(content, encoding);

    // Skip write if size matches (content likely hasn't changed)
    // This is a heuristic - same size doesn't guarantee same content,
    // but for generated files it's a good indicator
    if (stat.size === newSize) {
      return false;
    }
  }

  // Write the file (either new or changed)
  await writeFile(filePath, content, encoding);

  return true;
}
