'use strict';

import { basename, join } from 'node:path';

import { checkIndirectReferences } from './utils/checkIndirectReferences.mjs';
import { extractExports } from './utils/extractExports.mjs';
import { findDefinitions } from './utils/findDefinitions.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import {
  GITHUB_BLOB_URL,
  populate,
} from '../../utils/configuration/templates.mjs';
import { withExt, writeFile } from '../../utils/file.mjs';

export const name = 'api-links';
export const dependsOn = '@node-core/doc-kit/generators/ast-js';
export const defaultConfiguration = {
  sourceURL: `${GITHUB_BLOB_URL}lib/{fileName}`,
};

/**
 * Generates the `apilinks.json` file.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('api-links');
  /**
   * @type Record<string, string>
   */
  const definitions = {};

  input.forEach(program => {
    /**
     * Mapping of definitions to their line number
     *
     * @type {Record<string, number>}
     * @example { 'someclass.foo': 10 }
     */
    const nameToLineNumberMap = {};

    const fileName = basename(program.path);
    const baseName = withExt(fileName);

    const exports = extractExports(program, baseName, nameToLineNumberMap);

    findDefinitions(program, baseName, nameToLineNumberMap, exports);

    checkIndirectReferences(program, exports, nameToLineNumberMap);

    const fullGitUrl = populate(config.sourceURL, {
      ...config,
      fileName,
    });

    // Add the exports we found in this program to our output
    Object.keys(nameToLineNumberMap).forEach(key => {
      const lineNumber = nameToLineNumberMap[key];

      definitions[key] = `${fullGitUrl}#L${lineNumber}`;
    });
  });

  if (config.output) {
    const out = join(config.output, 'apilinks.json');

    await writeFile(
      out,
      config.minify
        ? JSON.stringify(definitions)
        : JSON.stringify(definitions, null, 2)
    );
  }

  return definitions;
}
