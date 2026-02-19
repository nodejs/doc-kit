'use strict';

import { writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { checkIndirectReferences } from './utils/checkIndirectReferences.mjs';
import { extractExports } from './utils/extractExports.mjs';
import { findDefinitions } from './utils/findDefinitions.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { GH_BLOB_URL, populate } from '../../utils/configuration/templates.mjs';

/**
 * Generates the `apilinks.json` file.
 *
 * @type {import('./types').Implementation['generate']}
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

    // `http.js` -> `http`
    const baseName = basename(program.path, '.js');

    const exports = extractExports(program, baseName, nameToLineNumberMap);

    findDefinitions(program, baseName, nameToLineNumberMap, exports);

    checkIndirectReferences(program, exports, nameToLineNumberMap);

    const fullGitUrl = `${populate(GH_BLOB_URL, config)}lib/${baseName}.js`;

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
