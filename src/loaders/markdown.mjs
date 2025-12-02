'use strict';

import { globSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { VFile } from 'vfile';

/**
 * This method creates a simple abstract "Loader", which technically
 * could be used for different things, but here we want to use it to load
 * Markdown files and transform them into VFiles
 */
const createLoader = () => {
  /**
   * Loads API Doc files and transforms it into VFiles
   *
   * @param {Array<string>} searchPath A glob/path for API docs to be loaded
   * @param {Array<string> | undefined} [ignorePath] A glob/path of files to ignore
   * The input string can be a simple path (relative or absolute)
   * The input string can also be any allowed glob string
   * @returns {Promise<VFile[]>}
   *
   * @see https://code.visualstudio.com/docs/editor/glob-patterns
   */
  const loadFiles = async (searchPath, ignorePath) => {
    const ignoredFiles = ignorePath
      ? globSync(ignorePath).filter(filePath => extname(filePath) === '.md')
      : [];

    const resolvedFiles = globSync(searchPath).filter(
      filePath =>
        extname(filePath) === '.md' && !ignoredFiles.includes(filePath)
    );

    return Promise.all(
      resolvedFiles.map(async filePath => {
        const fileContents = await readFile(filePath, 'utf-8');

        return new VFile({ path: filePath, value: fileContents });
      })
    );
  };

  return { loadFiles };
};

export default createLoader;
