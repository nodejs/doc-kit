'use strict';

import { getLineNumber } from './getLineNumber.mjs';
import { CONSTRUCTOR_EXPRESSION } from '../constants.mjs';

/**
 *
 */
function handleExpression(
  node,
  basename,
  nameToLineNumberMap,
  sourceText,
  program,
  exports
) {
  const expression = node.expression;
  if (expression.type !== 'AssignmentExpression') {
    return;
  }

  let lhs = expression.left;
  let rhs = expression.right;

  if (lhs.type !== 'MemberExpression') {
    return;
  }
  if (lhs.object.type === 'MemberExpression') {
    lhs = lhs.object;
  }

  if (lhs.object.name === 'exports') {
    switch (rhs.type) {
      case 'FunctionExpression':
        nameToLineNumberMap[`${basename}.${lhs.property.name}`] = getLineNumber(
          sourceText,
          node.range[0],
          program
        );
        break;
      case 'Identifier':
        exports.indirects[rhs.name] = `${basename}.${lhs.property.name}`;
        break;
      default:
        if (lhs.property.name !== undefined) {
          exports.identifiers.push(lhs.property.name);
        }
        break;
    }
  } else if (lhs.object.name === 'module' && lhs.property.name === 'exports') {
    while (rhs.type === 'AssignmentExpression') {
      rhs = rhs.right;
    }

    switch (rhs.type) {
      case 'NewExpression':
        exports.ctors.push(rhs.callee.name);
        break;
      case 'ObjectExpression':
        // eslint-disable-next-line no-case-declarations
        const props = rhs.properties;

        for (let i = 0; i < props.length; i++) {
          const value = props[i].value;

          if (!value) {
            continue;
          }

          if (value.type === 'Identifier') {
            exports.identifiers.push(value.name);
            if (CONSTRUCTOR_EXPRESSION.test(value.name[0])) {
              exports.ctors.push(value.name);
            }
          } else if (value.type === 'CallExpression') {
            if (value.callee.name === 'deprecate' && value.arguments[0]) {
              exports.identifiers.push(value.arguments[0].name);
            }
          }
        }
        break;
      case 'Identifier':
        if (rhs.name !== undefined) {
          exports.identifiers.push(rhs.name);
          if (CONSTRUCTOR_EXPRESSION.test(rhs.name[0])) {
            exports.ctors.push(rhs.name);
          }
        }
        break;
    }
  }
}

/**
 *
 */
function handleVariableDeclaration(
  node,
  basename,
  nameToLineNumberMap,
  sourceText,
  program,
  exports
) {
  const declarations = node.declarations;
  for (let i = 0; i < declarations.length; i++) {
    const declarator = declarations[i];
    let lhs = declarator.init;
    const id = declarator.id;

    while (lhs && lhs.type === 'AssignmentExpression') {
      lhs = lhs.left;
    }

    if (!lhs || lhs.type !== 'MemberExpression') {
      continue;
    }

    const range = declarator.range || node.range;
    if (lhs.object.name === 'exports') {
      nameToLineNumberMap[`${basename}.${lhs.property.name}`] = getLineNumber(
        sourceText,
        range[0],
        program
      );
    } else if (
      lhs.object.name === 'module' &&
      lhs.property.name === 'exports'
    ) {
      exports.ctors.push(id.name);
      nameToLineNumberMap[id.name] = getLineNumber(
        sourceText,
        range[0],
        program
      );
    }
  }
}

/**
 *
 */
export function extractExports(program, basename, nameToLineNumberMap) {
  const exports = { ctors: [], identifiers: [], indirects: {} };
  const body = program.body;
  if (!body) {
    return exports;
  }

  const sourceText = program.sourceText;

  for (let i = 0; i < body.length; i++) {
    let node = body[i];
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      node = node.declaration;
    }

    if (node.type === 'ExpressionStatement') {
      handleExpression(
        node,
        basename,
        nameToLineNumberMap,
        sourceText,
        program,
        exports
      );
    } else if (node.type === 'VariableDeclaration') {
      handleVariableDeclaration(
        node,
        basename,
        nameToLineNumberMap,
        sourceText,
        program,
        exports
      );
    }
  }

  return exports;
}
