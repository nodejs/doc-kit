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
  const files = await glob('*', {
    cwd: srcDir,
    dot: true,
    nodir: true,
  });

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

    const fileContent = await readFile(sourcePath);

    await writeFile(targetPath, fileContent);
  }
}
