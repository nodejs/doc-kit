'use strict';

import { copyFile, readdir, stat, constants } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Attempts to copy a file forcibly (`COPYFILE_FICLONE_FORCE`. Otherwise, falls back to a time-based check approach)
 *
 * @param {string} srcDir - Source directory path
 * @param {string} targetDir - Target directory path
 */
export async function safeCopy(srcDir, targetDir) {
  try {
    await copyFile(srcDir, targetDir, constants.COPYFILE_FICLONE);
  } catch (err) {
    if (err?.syscall !== 'copyfile') {
      throw err;
    }

    const files = await readdir(srcDir);

    for (const file of files) {
      const sourcePath = join(srcDir, file);
      const targetPath = join(targetDir, file);

      const [sStat, tStat] = await Promise.all([
        stat(sourcePath),
        stat(targetPath),
      ]).catch(() => []);

      const shouldWrite =
        !tStat ||
        sStat.value.size !== tStat.value.size ||
        sStat.value.mtimeMs > tStat.value.mtimeMs;

      if (!shouldWrite) {
        continue;
      }

      await copyFile(sourcePath, targetPath);
    }
  }
}
