'use strict';

import { globSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { VFile } from 'vfile';

/**
 * This creates a "loader" for loading Javascript source files into VFiles.
 */
const createLoader = () => {
  /**
   * Loads the JavaScript source files and transforms them into VFiles
   *
   * @param {string | Array<string>} searchPath
   * @returns {Promise<VFile[]>}
   */
  const loadFiles = async searchPath => {
    const resolvedFiles = globSync(searchPath);
    const jsFiles = resolvedFiles.filter(
      filePath => extname(filePath) === '.js'
    );

    return Promise.all(
      jsFiles.map(async filePath => {
        const fileContents = await readFile(filePath, 'utf-8');

        return new VFile({ path: filePath, value: fileContents });
      })
    );
  };

  return { loadFiles };
};

export default createLoader;
