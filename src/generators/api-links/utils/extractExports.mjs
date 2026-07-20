'use strict';

import { walk } from 'oxc-walker';

import { getLineNumber } from './getLineNumber.mjs';
import { CONSTRUCTOR_EXPRESSION } from '../constants.mjs';

/**
 * @see https://github.com/estree/estree/blob/master/es5.md#assignmentexpression
 *
 * @param {import('@oxc-project/types').ExpressionStatement} node
 * @param {string} basename
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {string} sourceText
 * @returns {import('../types').ProgramExports | undefined}
 */
function handleExpression(node, basename, nameToLineNumberMap, sourceText) {
  const { expression } = node;

  if (expression.type !== 'AssignmentExpression') {
    return;
  }

  // `a=b`, lhs=`a` and rhs=`b`
  let { left: lhs, right: rhs } = expression;

  if (lhs.type !== 'MemberExpression') {
    return undefined;
  }

  if (lhs.object.type === 'MemberExpression') {
    lhs = lhs.object;
  }

  /**
   * @type {import('../types').ProgramExports}
   */
  const exports = {
    ctors: [],
    identifiers: [],
    indirects: {},
  };

  if (lhs.object.name === 'exports') {
    // This is an assignment to a property in `module.exports` or `exports`
    //  (i.e. `module.exports.asd = ...` or `exports.asd = ...`)

    switch (rhs.type) {
      /** @see https://github.com/estree/estree/blob/master/es5.md#functionexpression */
      case 'FunctionExpression': {
        // module.exports.something = () => {}
        nameToLineNumberMap[`${basename}.${lhs.property.name}`] = getLineNumber(
          sourceText,
          node.range[0]
        );

        break;
      }
      /** @see https://github.com/estree/estree/blob/master/es5.md#identifier */
      case 'Identifier': {
        // Save this for later in case it's referenced
        // exports.Buffer = Buffer -> indirect mapping
        exports.indirects[rhs.name] = `${basename}.${lhs.property.name}`;

        break;
      }
      default: {
        if (lhs.property.name !== undefined) {
          exports.identifiers.push(lhs.property.name);
        }

        break;
      }
    }
  } else if (lhs.object.name === 'module' && lhs.property.name === 'exports') {
    // This is an assignment to `module.exports` as a whole
    //  (i.e. `module.exports = {}`)

    // We need to move right until we find the value of the assignment.
    //  (if `a=b`, we want `b`)
    while (rhs.type === 'AssignmentExpression') {
      rhs = rhs.right;
    }

    switch (rhs.type) {
      /** @see https://github.com/estree/estree/blob/master/es5.md#newexpression */
      case 'NewExpression': {
        // module.exports = new Asd()
        exports.ctors.push(rhs.callee.name);
        break;
      }
      /** @see https://github.com/estree/estree/blob/master/es5.md#objectexpression */
      case 'ObjectExpression': {
        // module.exports = {}
        // we need to go through all of the properties and register them
        rhs.properties.forEach(({ value }) => {
          switch (value.type) {
            case 'Identifier': {
              exports.identifiers.push(value.name);

              if (CONSTRUCTOR_EXPRESSION.test(value.name[0])) {
                exports.ctors.push(value.name);
              }

              break;
            }
            case 'CallExpression': {
              if (value.callee.name !== 'deprecate') {
                break;
              }

              // Handle exports wrapped in the `deprecate` function
              //  Ex/ https://github.com/nodejs/node/blob/e96072ad57348ce423a8dd7639dcc3d1c34e847d/lib/buffer.js#L1334

              exports.identifiers.push(value.arguments[0].name);

              break;
            }
            default: {
              // Not relevant
            }
          }
        });

        break;
      }
      /** @see https://github.com/estree/estree/blob/master/es5.md#identifier */
      case 'Identifier': {
        // Something else, let's save it for when we're searching for
        //  declarations

        if (rhs.name !== undefined) {
          exports.identifiers.push(rhs.name);
          if (CONSTRUCTOR_EXPRESSION.test(rhs.name[0])) {
            exports.ctors.push(rhs.name);
          }
        }

        break;
      }
      default: {
        // Not relevant
        break;
      }
    }
  }

  return exports;
}

/**
 * @see https://github.com/estree/estree/blob/master/es5.md#variabledeclaration
 *
 * @param {import('@oxc-project/types').VariableDeclaration} node
 * @param {string} basename
 * @param {Record<string, number>} nameToLineNumberMap
 * @param {string} sourceText
 * @returns {import('../types').ProgramExports | undefined}
 */
function handleVariableDeclaration(
  node,
  basename,
  nameToLineNumberMap,
  sourceText
) {
  /**
   * @type {import('../types').ProgramExports}
   */
  const exports = {
    ctors: [],
    identifiers: [],
    indirects: {},
  };

  node.declarations.forEach(declarator => {
    let lhs = declarator.init;
    const id = declarator.id;

    while (lhs && lhs.type === 'AssignmentExpression') {
      // Move left until we get to what we're assigning to
      //  (if `a=b`, we want `a`)
      lhs = lhs.left;
    }

    if (!lhs || lhs.type !== 'MemberExpression') {
      // Doesn't exist or we're not writing to an object
      //  (aka it's just a regular variable like `const a = 123`)
      return;
    }

    const range = declarator.range || node.range;

    switch (lhs.object.name) {
      case 'exports': {
        nameToLineNumberMap[`${basename}.${lhs.property.name}`] = getLineNumber(
          sourceText,
          range[0]
        );

        break;
      }
      case 'module': {
        if (lhs.property.name !== 'exports') {
          break;
        }

        exports.ctors.push(id.name);
        nameToLineNumberMap[id.name] = getLineNumber(sourceText, range[0]);

        break;
      }
      default: {
        // Not relevant to us
        break;
      }
    }
  });

  return exports;
}

/**
 * We need to find what a source file exports so we know what to include in
 * the final result. We can do this by going through every statement in the
 * program looking for assignments to `module.exports`.
 *
 * Noteworthy that exports can happen throughout the program so we need to
 * go through the entire thing.
 *
 * @param {import('@oxc-project/types').Program} program
 * @param {string} basename
 * @param {Record<string, number>} nameToLineNumberMap
 * @returns {import('../types').ProgramExports}
 */
export function extractExports(program, basename, nameToLineNumberMap) {
  /**
   * @type {import('../types').ProgramExports}
   */
  const exports = {
    ctors: [],
    identifiers: [],
    indirects: {},
  };

  const TYPE_TO_HANDLER_MAP = {
    /**
     * @param {import('@oxc-project/types').Node} node
     */
    ExpressionStatement: node =>
      handleExpression(node, basename, nameToLineNumberMap, program.sourceText),

    /**
     * @param {import('@oxc-project/types').Node} node
     */
    VariableDeclaration: node =>
      handleVariableDeclaration(
        node,
        basename,
        nameToLineNumberMap,
        program.sourceText
      ),
  };

  walk(program, {
    /**
     *
     */
    enter(node) {
      if (node.type in TYPE_TO_HANDLER_MAP) {
        const handler = TYPE_TO_HANDLER_MAP[node.type];

        const output = handler(node);

        if (output) {
          exports.ctors.push(...output.ctors);
          exports.identifiers.push(...output.identifiers);

          Object.keys(output.indirects).forEach(key => {
            exports.indirects[key] = output.indirects[key];
          });
        }
      }
    },
  });

  return exports;
}
