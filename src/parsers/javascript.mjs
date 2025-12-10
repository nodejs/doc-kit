'use strict';

import * as acorn from 'acorn';

/**
 * Parses a given JavaScript file into an ESTree AST representation of it
 *
 * @param {import('vfile').VFile | Promise<import('vfile').VFile>} sourceFile
 * @returns {Promise<JsProgram>}
 */
export const parseJsSource = async sourceFile => {
  // We allow the API doc VFile to be a Promise of a VFile also,
  // hence we want to ensure that it first resolves before we pass it to the parser
  const resolvedSourceFile = await Promise.resolve(sourceFile);

  if (typeof resolvedSourceFile.value !== 'string') {
    throw new TypeError(
      `expected resolvedSourceFile.value to be string but got ${typeof resolvedSourceFile.value}`
    );
  }

  const res = acorn.parse(resolvedSourceFile.value, {
    allowReturnOutsideFunction: true,
    ecmaVersion: 'latest',
    locations: true,
  });

  return { ...res, path: resolvedSourceFile.path };
};
