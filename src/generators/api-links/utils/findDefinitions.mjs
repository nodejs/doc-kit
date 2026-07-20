'use strict';

import { getLineNumber } from './getLineNumber.mjs';

/**
 *
 */
function handleAssignmentExpression(
  node,
  nameToLineNumberMap,
  exports,
  sourceText,
  program
) {
  const expression = node.expression;
  if (expression.type !== 'AssignmentExpression') {
    return;
  }

  const lhs = expression.left;
  const rhs = expression.right;

  if (lhs.type !== 'MemberExpression') {
    return;
  }

  let object;
  let objectName;

  if (lhs.object.type === 'MemberExpression') {
    if (lhs.object.property.name !== 'prototype') {
      return;
    }
    object = lhs.object.object;
    objectName = object.name ? object.name : object.object.name;
    objectName = objectName.toLowerCase();
    if (objectName === 'buffer') {
      objectName = 'buf';
    }
  } else if (lhs.object.type === 'Identifier') {
    object = lhs.object;
    objectName = object.name;
  } else {
    return;
  }

  if (!exports.ctors.includes(object.name)) {
    return;
  }

  const name = `${objectName}${lhs.computed ? `[${lhs.property.name}]` : `.${lhs.property.name}`}`;
  nameToLineNumberMap[name] = getLineNumber(sourceText, node.range[0], program);

  if (rhs && rhs.type === 'Identifier' && lhs.property.name === rhs.name) {
    exports.indirects[rhs.name] = name;
  }
}

/**
 *
 */
function handleFunctionDeclaration(
  node,
  basename,
  nameToLineNumberMap,
  exports,
  sourceText,
  program
) {
  if (!exports.identifiers.includes(node.id.name)) {
    return;
  }
  // 95 is '_' - avoids string allocation/slicing in startsWith
  if (basename.charCodeAt(0) === 95) {
    return;
  }

  nameToLineNumberMap[`${basename}.${node.id.name}`] = getLineNumber(
    sourceText,
    node.range[0],
    program
  );
}

/**
 *
 */
function handleClassDeclaration(
  node,
  nameToLineNumberMap,
  exports,
  sourceText,
  program
) {
  if (!exports.ctors.includes(node.id.name)) {
    return;
  }

  const name = node.id.name[0].toLowerCase() + node.id.name.substring(1);
  nameToLineNumberMap[node.id.name] = getLineNumber(
    sourceText,
    node.range[0],
    program
  );

  const members = node.body.body;
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    if (member.type !== 'MethodDefinition') {
      continue;
    }

    const { key, kind, range } = member;
    const outputKey =
      kind === 'constructor' ? `new ${node.id.name}` : `${name}.${key.name}`;
    nameToLineNumberMap[outputKey] = getLineNumber(
      sourceText,
      range[0],
      program
    );
  }
}

/**
 *
 */
export function findDefinitions(
  program,
  basename,
  nameToLineNumberMap,
  exports
) {
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

    if (node.type === 'ExpressionStatement') {
      handleAssignmentExpression(
        node,
        nameToLineNumberMap,
        exports,
        sourceText,
        program
      );
    } else if (node.type === 'FunctionDeclaration') {
      handleFunctionDeclaration(
        node,
        basename,
        nameToLineNumberMap,
        exports,
        sourceText,
        program
      );
    } else if (node.type === 'ClassDeclaration') {
      handleClassDeclaration(
        node,
        nameToLineNumberMap,
        exports,
        sourceText,
        program
      );
    }
  }
}
