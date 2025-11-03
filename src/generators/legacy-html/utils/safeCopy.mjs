'use strict';

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { glob } from 'glob';

/**
 * Safely copies files from source to target directory, skipping files that haven't changed
 * based on file stats (size and modification time)
 *
 * @param {string} srcDir - Source directory path
 * @param {string} targetDir - Target directory path
 */
export async function safeCopy(srcDir, targetDir) {
  // Get all files in the source folder (no subdirectories expected)
  const files = await glob('*', {
    cwd: srcDir,
    dot: true,
    nodir: true,
  });

  // Copy each file individually
  for (const file of files) {
    const sourcePath = join(srcDir, file);

    const targetPath = join(targetDir, file);

    const [sStat, tStat] = await Promise.allSettled([
      stat(sourcePath),
      stat(targetPath),
    ]);

    const shouldWrite =
      // the target file doesn't exist
      sStat.status === 'rejected' ||
      // file sizes are different
      sStat.size !== tStat.size ||
      // source got modified / is newer
      sStat.mtimeMs > tStat.mtimeMs;

    if (shouldWrite) {
      const fileContent = await readFile(sourcePath);

      await writeFile(targetPath, fileContent);
    }
  }
}
