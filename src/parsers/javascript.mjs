'use strict';

import * as acorn from 'acorn';

/**
 * Parses a given JavaScript file into an ESTree AST representation of it
 *
 * @param {import('vfile').VFile} sourceFile
 * @returns {Promise<JsProgram>}
 */
export const parseJsSource = async sourceFile => {
  if (typeof sourceFile.value !== 'string') {
    throw new TypeError(
      `expected sourceFile.value to be string but got ${typeof sourceFile.value}`
    );
  }

  const res = acorn.parse(sourceFile.value, {
    allowReturnOutsideFunction: true,
    ecmaVersion: 'latest',
    locations: true,
  });

  return { ...res, path: sourceFile.path };
};
