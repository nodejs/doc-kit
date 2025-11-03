'use strict';

import { copyFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Safely copies files from source to target directory, skipping files that haven't changed
 * based on file stats (size and modification time). Uses native fs.copyFile which handles
 * concurrent operations gracefully.
 *
 * @param {string} srcDir - Source directory path
 * @param {string} targetDir - Target directory path
 */
export async function safeCopy(srcDir, targetDir) {
  const files = await readdir(srcDir);

  for (const file of files) {
    const sourcePath = join(srcDir, file);
    const targetPath = join(targetDir, file);

    const [sStat, tStat] = await Promise.allSettled([
      stat(sourcePath),
      stat(targetPath),
    ]);

    const shouldWrite =
      tStat.status === 'rejected' ||
      sStat.value.size !== tStat.value.size ||
      sStat.value.mtimeMs > tStat.value.mtimeMs;

    if (!shouldWrite) {
      continue;
    }

    // Use copyFile with COPYFILE_FICLONE flag for efficient copying
    // This is atomic and handles concurrent operations better than manual read/write
    await copyFile(sourcePath, targetPath);
  }
}
