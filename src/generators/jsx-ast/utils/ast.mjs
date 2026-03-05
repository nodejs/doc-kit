import { u as createTree } from 'unist-builder';

import { AST_NODE_TYPES } from '../constants.mjs';

/**
 * @typedef {Object} JSXOptions
 * @property {boolean} [inline] - Whether the element is inline
 * @property {(string | Array<import('unist').Node>)} [children] - Child content or nodes
 */

/**
 * Converts JavaScript values to ESTree AST nodes
 *
 * @param {*} value - The value to convert to an ESTree node
 */
export const toESTree = value => {
  // Preserve existing ESTree nodes, since they
  // don't need to be re-processed.
  if (value?.type === AST_NODE_TYPES.ESTREE.JSX_FRAGMENT) {
    return value;
  }

  // Handle undefined
  if (value === undefined) {
    return { type: AST_NODE_TYPES.ESTREE.IDENTIFIER, name: 'undefined' };
  }

  // Handle primitive values (null, string, number, boolean)
  if (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return { type: AST_NODE_TYPES.ESTREE.LITERAL, value };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return {
      type: AST_NODE_TYPES.ESTREE.ARRAY_EXPRESSION,
      elements: value.map(toESTree),
    };
  }

  // Handle plain objects
  if (typeof value === 'object') {
    return {
      type: AST_NODE_TYPES.ESTREE.OBJECT_EXPRESSION,
      properties: Object.entries(value).map(([key, val]) => ({
        type: AST_NODE_TYPES.ESTREE.PROPERTY,
        key: { type: AST_NODE_TYPES.ESTREE.IDENTIFIER, name: key },
        value: toESTree(val),
        kind: 'init',
        method: false,
        shorthand: false,
        computed: false,
      })),
    };
  }

  // We only need to convert simple types. This should never be reached.
  throw new Error('Unsupported value type for ESTree conversion');
};

/**
 * Creates an MDX JSX element.
 *
 * @param {string} name - The name of the JSX element
 * @param {JSXOptions & Record<string, any>} [options={}] - Options and/or attributes for the JSX node.
 * @returns {import('unist').Node} The created MDX JSX element node
 */
export const createJSXElement = (
  name,
  { inline = true, children = [], ...attributes } = {}
) => {
  // Convert string children to text node or use array directly
  const processedChildren =
    typeof children === 'string'
      ? [createTree('text', { value: children })]
      : children;

  const elementType = inline
    ? AST_NODE_TYPES.MDX.JSX_INLINE_ELEMENT
    : AST_NODE_TYPES.MDX.JSX_BLOCK_ELEMENT;

  const attrs = Object.entries(attributes)
    // Skip undefined/null values
    .filter(([, value]) => value != null)
    .map(([key, value]) => createAttributeNode(key, value));

  return createTree(elementType, {
    name,
    attributes: attrs,
    children: processedChildren,
  });
};

/**
 * Creates an MDX JSX attribute node based on the value type.
 *
 * @param {string} name - The attribute name
 * @param {any} value - The attribute value
 * @returns {import('unist').Node} The MDX JSX attribute node
 */
export const createAttributeNode = (name, value) => {
  // Use expression for objects and arrays
  if (value !== null && typeof value === 'object') {
    return createTree(AST_NODE_TYPES.MDX.JSX_ATTRIBUTE, {
      name,
      value: createTree(AST_NODE_TYPES.MDX.JSX_ATTRIBUTE_EXPRESSION, {
        data: {
          estree: {
            type: AST_NODE_TYPES.ESTREE.PROGRAM,
            body: [
              {
                type: AST_NODE_TYPES.ESTREE.EXPRESSION_STATEMENT,
                expression: toESTree(value),
              },
            ],
          },
        },
      }),
    });
  }

  // For primitives, use simple string conversion.
  // If nullish, pass nothing.
  return createTree(AST_NODE_TYPES.MDX.JSX_ATTRIBUTE, {
    name,
    value: value == null ? value : String(value),
  });
};
