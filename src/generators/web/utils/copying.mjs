import { constants } from 'node:fs';
import { stat, cp, mkdir, copyFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';

import logger from '../../../logger/index.mjs';

/**
 * Copies static directories/files defined in `pathsToCopy` to the output directory.
 * @param {import('../types').Configuration} config
 */
export async function copyStaticAssets(config) {
  if (Array.isArray(config.pathsToCopy)) {
    for (const item of config.pathsToCopy) {
      if (!item) {
        continue;
      }

      const copyTasks =
        typeof item === 'string'
          ? [{ src: item, dest: join(config.output, basename(item)) }]
          : Object.entries(item).map(([src, dest]) => ({
              src,
              dest: join(config.output, dest.replace(/^[/\\]+/, '')),
            }));

      for (const { src, dest } of copyTasks) {
        try {
          const fileStats = await stat(src);

          if (fileStats.isDirectory()) {
            await cp(src, dest, { recursive: true, force: true });
          } else {
            await mkdir(dirname(dest), { recursive: true });
            await copyFile(src, dest, constants.COPYFILE_FICLONE);
          }
        } catch (err) {
          if (err.code !== 'ENOENT') {
            logger.error(
              `[web-generator] Failed to copy asset from ${src} to ${dest}: ${err.message}`
            );
          }
        }
      }
    }
  }
}
