import { walk } from 'oxc-walker';

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

  walk(program, {
    /**
     *
     */
    enter(node) {
      if (node.type !== 'FunctionDeclaration') {
        return;
      }

      const name = node.id.name;

      if (name in exports.indirects) {
        nameToLineNumberMap[exports.indirects[name]] = getLineNumber(
          program.sourceText,
          node.range[0]
        );
      }
    },
  });
}
