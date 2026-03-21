import { visit } from 'estree-util-visit';

/**
 * @param {import('acorn').Program} program
 * @param {import('../types.d.ts').ProgramExports} exports
 * @param {Record<string, number>} nameToLineNumberMap
 */
export function checkIndirectReferences(program, exports, nameToLineNumberMap) {
  if (Object.keys(exports.indirects).length === 0) {
    return;
  }

  visit(program, node => {
    if (!node.loc || node.type !== 'FunctionDeclaration') {
      return;
    }

    const name = node.id.name;

    if (name in exports.indirects) {
      nameToLineNumberMap[exports.indirects[name]] = node.loc.start.line;
    }
  });
}
