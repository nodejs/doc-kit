'use strict';

import { statSync, constants } from 'node:fs';
import { copyFile, readdir } from 'node:fs/promises';
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

  const promises = files.map(file => {
    const sourcePath = join(srcDir, file);
    const targetPath = join(targetDir, file);

    const tStat = statSync(targetPath, { throwIfNoEntry: false });

    if (tStat === undefined) {
      return copyFile(sourcePath, targetPath, constants.COPYFILE_FICLONE);
    }

    const sStat = statSync(sourcePath);

    if (sStat.size !== tStat.size || sStat.mtimeMs > tStat.mtimeMs) {
      return copyFile(sourcePath, targetPath, constants.COPYFILE_FICLONE);
    }
  });

  await Promise.all(promises);
}
