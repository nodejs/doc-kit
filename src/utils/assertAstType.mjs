'use strict';

import { enforceArray } from './array.mjs';
import { GeneratorError } from './generator-error.mjs';

/**
 * @typedef {import('mdast').BlockContentMap} BlockContentMap
 * @typedef {import('mdast').ListContentMap} ListContentMap
 * @typedef {import('mdast').FrontmatterContentMap} FrontmatterContentMap
 * @typedef {import('mdast').PhrasingContentMap} PhrasingContentMap
 * @typedef {import('mdast').RootContentMap} RootContentMap
 * @typedef {import('mdast').RowContentMap} RowContentMap
 * @typedef {import('mdast').TableContentMap} TableContentMap
 * @typedef {import('mdast').DefinitionContentMap} DefinitionContentMap
 *
 * @typedef {BlockContentMap & ListContentMap & FrontmatterContentMap & PhrasingContentMap & RootContentMap & RowContentMap & TableContentMap & DefinitionContentMap} NodeTypes
 */

/**
 * @template {keyof NodeTypes} T
 *
 * @param {import('mdast').Node} node
 * @param {T | Array<T>} type
 * @returns {NodeTypes[T]}
 */
export function assertAstType(node, type) {
  if (node?.type === undefined) {
    throw new GeneratorError(`expected node.type to be defined`);
  }

  type = enforceArray(type);

  if (!type.includes(node.type)) {
    throw new GeneratorError(
      `expected node to have type ${type}, got ${node.type}`
    );
  }

  return node;
}

/**
 * @template {keyof NodeTypes} T
 *
 * @param {import('mdast').Node | undefined} node
 * @param {T} type
 * @returns {NodeTypes[T] | undefined}
 */
export function assertAstTypeOptional(node, type) {
  if (!node) {
    return undefined;
  }

  return assertAstType(node, type);
}
