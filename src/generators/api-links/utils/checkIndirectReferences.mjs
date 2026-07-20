'use strict';

import { getLineNumber } from './getLineNumber.mjs';

/**
 * @param {import('@oxc-project/types').Program} program
 * @param {import('../types.d.ts').ProgramExports} exports
 * @param {Record<string, number>} nameToLineNumberMap
 */
export function checkIndirectReferences(program, exports, nameToLineNumberMap) {
  if (Object.keys(exports.indirects).length === 0) {
    return;
  }

  const body = program.body;
  if (!body) {
    return;
  }

  const sourceText = program.sourceText;

  for (let i = 0; i < body.length; i++) {
    let node = body[i];
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      node = node.declaration;
    }

    if (node.type === 'FunctionDeclaration') {
      const name = node.id.name;
      if (name in exports.indirects) {
        nameToLineNumberMap[exports.indirects[name]] = getLineNumber(
          sourceText,
          node.range[0],
          program
        );
      }
    }
  }
}
