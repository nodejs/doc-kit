import { glob } from 'node:fs/promises';
import path from 'node:path';

import { COMPARISON_FILE } from '../constants.mjs';

export const listOutputFiles = async directory => {
  const entries = glob('**/*', {
    cwd: directory,
    withFileTypes: true,
    exclude: entry => entry.name === COMPARISON_FILE,
  });

  return (await Array.fromAsync(entries))
    .filter(entry => entry.isFile())
    .map(entry =>
      path.relative(directory, path.join(entry.parentPath, entry.name))
    )
    .sort();
};
