import { glob } from 'node:fs/promises';
import path from 'node:path';

import { BENCHMARK_FILE, COMPARISON_FILE } from '../constants.mjs';

const METADATA_FILES = new Set([BENCHMARK_FILE, COMPARISON_FILE]);

export const listOutputFiles = async directory => {
  const entries = glob('**/*', {
    cwd: directory,
    withFileTypes: true,
    exclude: entry => METADATA_FILES.has(entry.name),
  });

  return (await Array.fromAsync(entries))
    .filter(entry => entry.isFile())
    .map(entry =>
      path.relative(directory, path.join(entry.parentPath, entry.name))
    )
    .sort();
};
