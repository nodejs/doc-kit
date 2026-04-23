'use strict';

import { basename, join } from 'node:path';

import getConfig from '#core/utils/configuration/index.mjs';
import {
  GITHUB_BLOB_URL,
  populate,
} from '#core/utils/configuration/templates.mjs';
import { withExt, writeFile } from '#core/utils/file.mjs';

import { findDefinitions } from '../../utils/api-links/definitions.mjs';
import { extractExports } from '../../utils/api-links/exports.mjs';
import { checkIndirectReferences } from '../../utils/api-links/indirectReferences.mjs';

export const name = 'api-links';
export const dependsOn = '@doc-kittens/internal/ast-js';
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
