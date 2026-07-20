'use strict';

import { Visitor } from 'oxc-parser';

import { getLineNumber } from './getLineNumber.mjs';

/**
 * @see https://github.com/estree/estree/blob/master/es5.md#expressionstatement
 *
 * @param {import('@oxc-project/types').ExpressionStatement} node
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {import('../types').ProgramExports} exports
 * @param {string} sourceText
 */
function handleAssignmentExpression(
  node,
  nameToLineNumberMap,
  exports,
  sourceText
) {
  const { expression } = node;

  if (expression.type !== 'AssignmentExpression') {
    return;
  }

  const { left: lhs, right: rhs } = expression;

  if (lhs.type !== 'MemberExpression') {
    return;
  }

  /**
   * The property that's being written to
   */
  let object;

  /**
   * The lowercase name of the object that's being written to
   */
  let objectName;

  switch (lhs.object.type) {
    case 'MemberExpression': {
      if (lhs.object.property.name !== 'prototype') {
        return;
      }

      object = lhs.object.object;

      objectName = object.name ? object.name : object.object.name;
      objectName = objectName.toLowerCase();

      if (objectName === 'buffer') {
        objectName = 'buf';
      }

      break;
    }

    case 'Identifier': {
      object = lhs.object;
      objectName = object.name;

      break;
    }

    default: {
      return;
    }
  }

  if (!exports.ctors.includes(object.name)) {
    return;
  }

  const name = `${objectName}${lhs.computed ? `[${lhs.property.name}]` : `.${lhs.property.name}`}`;

  nameToLineNumberMap[name] = getLineNumber(sourceText, node.range[0]);

  if (rhs && rhs.type === 'Identifier' && lhs.property.name === rhs.name) {
    exports.indirects[rhs.name] = name;
  }
}

/**
 * @param {import('@oxc-project/types').FunctionDeclaration} node
 * @param {string} basename
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {import('../types').ProgramExports} exports
 * @param {string} sourceText
 */
function handleFunctionDeclaration(
  node,
  basename,
  nameToLineNumberMap,
  exports,
  sourceText
) {
  if (!exports.identifiers.includes(node.id.name)) {
    return;
  }

  if (basename.startsWith('_')) {
    return;
  }

  nameToLineNumberMap[`${basename}.${node.id.name}`] = getLineNumber(
    sourceText,
    node.range[0]
  );
}

/**
 * @param {import('@oxc-project/types').ClassDeclaration} node
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {import('../types').ProgramExports} exports
 * @param {string} sourceText
 */
function handleClassDeclaration(
  node,
  nameToLineNumberMap,
  exports,
  sourceText
) {
  if (!exports.ctors.includes(node.id.name)) {
    return;
  }

  const name = node.id.name[0].toLowerCase() + node.id.name.substring(1);

  nameToLineNumberMap[node.id.name] = getLineNumber(sourceText, node.range[0]);

  node.body.body.forEach(member => {
    if (member.type !== 'MethodDefinition') {
      return;
    }

    const { key, kind, range } = member;

    const outputKey =
      kind === 'constructor' ? `new ${node.id.name}` : `${name}.${key.name}`;

    nameToLineNumberMap[outputKey] = getLineNumber(sourceText, range[0]);
  });
}

/**
 * @param {import('@oxc-project/types').Program} program
 * @param {string} basename
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {import('../types').ProgramExports} exports
 */
export function findDefinitions(
  program,
  basename,
  nameToLineNumberMap,
  exports
) {
  const visitor = new Visitor({
    /**
     * @param {import('@oxc-project/types').ExpressionStatement} node
     */
    ExpressionStatement(node) {
      handleAssignmentExpression(
        node,
        nameToLineNumberMap,
        exports,
        program.sourceText
      );
    },

    /**
     * @param {import('@oxc-project/types').FunctionDeclaration} node
     */
    FunctionDeclaration(node) {
      handleFunctionDeclaration(
        node,
        basename,
        nameToLineNumberMap,
        exports,
        program.sourceText
      );
    },

    /**
     * @param {import('@oxc-project/types').ClassDeclaration} node
     */
    ClassDeclaration(node) {
      handleClassDeclaration(
        node,
        nameToLineNumberMap,
        exports,
        program.sourceText
      );
    },
  });

  visitor.visit(program);
}
