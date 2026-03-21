'use strict';

import { visit } from 'estree-util-visit';

/**
 * @see https://github.com/estree/estree/blob/master/es5.md#expressionstatement
 *
 * @param {import('acorn').ExpressionStatement} node
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {import('../types').ProgramExports} exports
 */
function handleAssignmentExpression(node, nameToLineNumberMap, exports) {
  const { expression } = node;

  if (expression.type !== 'AssignmentExpression') {
    return;
  }

  const { left: lhs, right: rhs } = expression;

  if (lhs.type !== 'MemberExpression') {
    // Not an assignment to a member, not relevant to us
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
    /** @see https://github.com/estree/estree/blob/master/es5.md#memberexpression */
    case 'MemberExpression': {
      if (lhs.object.property.name !== 'prototype') {
        return;
      }

      // Something like `ClassName.prototype.asd = 123`
      object = lhs.object.object;

      objectName = object.name ? object.name : object.object.name;
      objectName = objectName.toLowerCase();

      // Special case for buffer since some of the docs refer to it as `buf`
      //  https://github.com/nodejs/node/pull/22405#issuecomment-414452461
      if (objectName === 'buffer') {
        objectName = 'buf';
      }

      break;
    }
    /** @see https://github.com/estree/estree/blob/master/es5.md#identifier */
    case 'Identifier': {
      object = lhs.object;
      objectName = object.name;

      break;
    }
    default: {
      // Not relevant to us
      return;
    }
  }

  if (!exports.ctors.includes(object.name)) {
    // The object being written to isn't exported, not relevant to us
    return;
  }

  /**
   * Name/key for this exported object that we're putting in the output
   * @example `clientrequest._finish`
   */
  const name = `${objectName}${lhs.computed ? `[${lhs.property.name}]` : `.${lhs.property.name}`}`;

  nameToLineNumberMap[name] = node.loc.start.line;

  if (lhs.property.name === rhs.name) {
    exports.indirects[rhs.name] = name;
  }
}

/**
 * @param {import('acorn').FunctionDeclaration} node
 * @param {string} basename
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {import('../types').ProgramExports} exports
 */
function handleFunctionDeclaration(
  node,
  basename,
  nameToLineNumberMap,
  exports
) {
  if (!exports.identifiers.includes(node.id.name)) {
    // Function isn't exported, not relevant to us
    return;
  }

  if (basename.startsWith('_')) {
    // Internal function, don't include it in the docs
    return;
  }

  nameToLineNumberMap[`${basename}.${node.id.name}`] = node.loc.start.line;
}

/**
 * @param {import('acorn').ClassDeclaration} node
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {import('../types').ProgramExports} exports
 */
function handleClassDeclaration(node, nameToLineNumberMap, exports) {
  if (!exports.ctors.includes(node.id.name)) {
    // Class isn't exported, not relevant to us
    return;
  }

  // WASI -> wASI, Agent -> agent
  const name = node.id.name[0].toLowerCase() + node.id.name.substring(1);

  nameToLineNumberMap[node.id.name] = node.loc.start.line;

  node.body.body.forEach(({ key, type, kind, loc }) => {
    if (!loc || type !== 'MethodDefinition') {
      return;
    }

    const outputKey =
      kind === 'constructor' ? `new ${node.id.name}` : `${name}.${key.name}`;

    nameToLineNumberMap[outputKey] = loc.start.line;
  });
}

/**
 * @param {import('acorn').Program} program
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
  const TYPE_TO_HANDLER_MAP = {
    /**
     * @param {import('acorn').Node} node
     */
    ExpressionStatement: node =>
      handleAssignmentExpression(node, nameToLineNumberMap, exports),

    /**
     * @param {import('acorn').Node} node
     */
    FunctionDeclaration: node =>
      handleFunctionDeclaration(node, basename, nameToLineNumberMap, exports),

    /**
     * @param {import('acorn').Node} node
     */
    ClassDeclaration: node =>
      handleClassDeclaration(node, nameToLineNumberMap, exports),
  };

  visit(program, node => {
    if (!node.loc) {
      return;
    }

    if (node.type in TYPE_TO_HANDLER_MAP) {
      const handler = TYPE_TO_HANDLER_MAP[node.type];

      handler(node);
    }
  });
}
