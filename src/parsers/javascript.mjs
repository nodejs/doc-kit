'use strict';

import { parseSync } from 'oxc-parser';

/**
 * Creates a Javascript source parser for a given source file
 */
const createParser = () => {
  /**
   * Parses a given JavaScript file into an ESTree AST representation of it
   *
   * @param {import('vfile').VFile | Promise<import('vfile').VFile>} sourceFile
   * @returns {Promise<JsProgram>}
   */
  const parseJsSource = async sourceFile => {
    // We allow the API doc VFile to be a Promise of a VFile also,
    // hence we want to ensure that it first resolves before we pass it to the parser
    const resolvedSourceFile = await Promise.resolve(sourceFile);

    if (typeof resolvedSourceFile.value !== 'string') {
      throw new TypeError(
        `expected resolvedSourceFile.value to be string but got ${typeof resolvedSourceFile.value}`
      );
    }

    const result = parseSync(resolvedSourceFile.path, resolvedSourceFile.value);

    if (result.errors.length > 0) {
      throw new Error(
        `Failed to parse ${resolvedSourceFile.path}: ${result.errors[0].message}`
      );
    }

    return { ...result.program, path: resolvedSourceFile.path };
  };

  /**
   * Parses multiple JavaScript files into ESTree ASTs by wrapping parseJsSource
   *
   * @param {Array<import('vfile').VFile | Promise<import('vfile').VFile>>} apiDocs List of API doc files to be parsed
   * @returns {Promise<Array<JsProgram>>}
   */
  const parseJsSources = async apiDocs => {
    // We do a Promise.all, to ensure that each API doc is resolved asynchronously
    // but all need to be resolved first before we return the result to the caller
    const resolvedApiDocEntries = await Promise.all(apiDocs.map(parseJsSource));

    return resolvedApiDocEntries;
  };

  return { parseJsSource, parseJsSources };
};

export default createParser;
