'use strict';

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import getConfig from '#core/utils/configuration/index.mjs';
import { parse } from 'acorn';
import { globSync } from 'tinyglobby';

export const name = 'ast-js';

/**
 * Process a chunk of JavaScript files in a worker thread.
 * Parses JS source files into AST representations.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(inputSlice, itemIndices) {
  const filePaths = itemIndices.map(idx => inputSlice[idx]);

  const results = [];

  for (const path of filePaths) {
    const value = await readFile(path, 'utf-8');

    const parsed = parse(value, {
      allowReturnOutsideFunction: true,
      ecmaVersion: 'latest',
      locations: true,
    });

    parsed.path = path;

    results.push(parsed);
  }

  return results;
}

/**
 * Generates a JavaScript AST from the input files.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(_, worker) {
  const config = getConfig('ast-js');

  const files = globSync(config.input, { ignore: config.ignore }).filter(
    p => extname(p) === '.js'
  );

  // Parse the Javascript sources into ASTs in parallel using worker threads
  // source is both the items list and the fullInput since we use sliceInput
  for await (const chunkResult of worker.stream(files)) {
    yield chunkResult;
  }
}
