'use strict';

import { copyFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Copies files from source to target directory, skipping files that haven't changed.
 * Uses synchronous stat checks for simplicity and copyFile for atomic operations.
 *
 * @param {string} srcDir - Source directory path
 * @param {string} targetDir - Target directory path
 */
export async function safeCopy(srcDir, targetDir) {
  const files = await readdir(srcDir);

  for (const file of files) {
    const sourcePath = join(srcDir, file);
    const targetPath = join(targetDir, file);

    const tStat = await stat(targetPath).catch(() => undefined);

    if (tStat === undefined) {
      await copyFile(sourcePath, targetPath);
      continue;
    }

    const sStat = await stat(sourcePath);

    if (sStat.size !== tStat.size || sStat.mtimeMs > tStat.mtimeMs) {
      await copyFile(sourcePath, targetPath);
    }
  }
}
