'use strict';

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
 * @param {T} type
 * @returns {NodeTypes[T]}
 */
export function assertAstType(node, type) {
  if (node.type === undefined) {
    throw new GeneratorError(`expected node to be defined`);
  }

  if (node.type !== type) {
    throw new GeneratorError(
      `expected node to have type ${type}, got ${node.type}`
    );
  }

  return node;
}
