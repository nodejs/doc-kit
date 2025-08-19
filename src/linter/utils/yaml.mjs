'use strict';

import { isScalar, isSeq, isNode } from 'yaml';

/**
 * Searches for a property by name in a map node.
 *
 * @param {import('yaml').YAMLMap} node - The map node to search in.
 * @param {string} propertyName - The property name to search for.
 * @returns {import('yaml').Pair | undefined}
 */
export const findPropertyByName = (node, propertyName) => {
  return node.items.find(pair => {
    if (!isScalar(pair.key)) {
      return;
    }

    return pair.key.value === propertyName;
  });
};

/**
 * Normalizes a YAML node values into an array.
 *
 * @param {import('yaml').Node} node
 * @returns {import('yaml').Scalar[]}
 */
export const normalizeNode = node => {
  if (isScalar(node)) {
    return [node];
  }

  if (isSeq(node)) {
    // @ts-ignore
    return node.items.flatMap(item => normalizeNode(item));
  }

  throw new Error(`Unexpected node type: map`);
};

/**
 * Creates a factory function for generating error descriptors with proper line positioning
 * for YAML nodes within markdown documents.
 *
 * @param {import('mdast').Node} yamlNode
 * @param {import('yaml').LineCounter} lineCounter
 */
export const createYamlIssueReporter = (yamlNode, lineCounter) => {
  const initialLine = yamlNode.position?.start.line ?? 0;

  /**
   * @param {string} message
   * @param {import('yaml').Node} node
   * @returns {import('../types').IssueDescriptor}
   */
  return (message, node) => {
    const absoluteLine =
      isNode(node) && node.range
        ? initialLine + lineCounter.linePos(node.range[0]).line
        : initialLine;

    return {
      level: 'error',
      message,
      position: {
        start: {
          line: absoluteLine,
        },
        end: {
          line: absoluteLine,
        },
      },
    };
  };
};
