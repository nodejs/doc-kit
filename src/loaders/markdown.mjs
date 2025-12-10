'use strict';

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { globSync } from 'glob';
import { VFile } from 'vfile';

import createQueries from '../utils/queries/index.mjs';

const { updateStabilityPrefixToLink } = createQueries();

/**
 * This creates a "loader" for loading Markdown API doc files into VFiles.
 */
const createLoader = () => {
  /**
   * Loads Markdown source files and transforms them into VFiles.
   * Applies stability index normalization during load.
   *
   * @param {string | string[]} searchPath - Glob pattern(s) or file paths
   * @returns {Promise<VFile>[]} Array of promises resolving to VFiles
   */
  const loadFiles = searchPath => {
    const resolvedFiles = globSync(searchPath).filter(
      filePath => extname(filePath) === '.md'
    );

    return resolvedFiles.map(async filePath => {
      const fileContents = await readFile(filePath, 'utf-8');

      const vfile = new VFile({ path: filePath, value: fileContents });

      // Normalizes all the Stability Index prefixes with Markdown links
      updateStabilityPrefixToLink(vfile);

      return vfile;
    });
  };

  return { loadFiles };
};

export default createLoader;
