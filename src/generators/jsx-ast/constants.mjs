import { JSX_IMPORTS } from '../web/constants.mjs';

/**
 * UI classes for Node.js API stability levels
 *
 * @see https://nodejs.org/api/documentation.html#stability-index
 */
export const STABILITY_LEVELS = [
  'danger', // (0) Deprecated
  'warning', // (1) Experimental
  'success', // (2) Stable
  'info', // (3) Legacy
];

// How deep should the Table of Contents go?
export const TOC_MAX_HEADING_DEPTH = 3;

// 'Stability: '.length + ' - '.length
export const STABILITY_PREFIX_LENGTH = 14;

// 'Type: '.length
export const TYPE_PREFIX_LENGTH = 6;

/**
 * HTML tag to UI component mappings
 */
export const TAG_TRANSFORMS = {
  pre: JSX_IMPORTS.CodeBox.name,
  blockquote: JSX_IMPORTS.Blockquote.name,
};

/**
 * API lifecycle change labels
 */
export const LIFECYCLE_LABELS = {
  added_in: 'Added in',
  deprecated_in: 'Deprecated in',
  removed_in: 'Removed in',
  introduced_in: 'Introduced in',
};

// TODO(@avivkeller): These should be inherited from @node-core/website-i18n
export const INTERNATIONALIZABLE = {
  sourceCode: 'Source Code: ',
};

/**
 * Abstract Syntax Tree node type constants
 */
export const AST_NODE_TYPES = {
  MDX: {
    /**
     * Text-level JSX element
     *
     * @see https://github.com/syntax-tree/mdast-util-mdx-jsx#mdxjsxtextelement
     */
    JSX_INLINE_ELEMENT: 'mdxJsxTextElement',

    /**
     * Block-level JSX element
     *
     * @see https://github.com/syntax-tree/mdast-util-mdx-jsx#mdxjsxflowelement
     */
    JSX_BLOCK_ELEMENT: 'mdxJsxFlowElement',

    /**
     * JSX attribute
     *
     * @see https://github.com/syntax-tree/mdast-util-mdx-jsx#mdxjsxattribute
     */
    JSX_ATTRIBUTE: 'mdxJsxAttribute',

    /**
     * JSX expression attribute
     *
     * @see https://github.com/syntax-tree/mdast-util-mdx-jsx#mdxjsxattributevalueexpression
     */
    JSX_ATTRIBUTE_EXPRESSION: 'mdxJsxAttributeValueExpression',
  },
  ESTREE: {
    /**
     * AST Program node
     *
     * @see https://github.com/estree/estree/blob/master/es5.md#programs
     */
    PROGRAM: 'Program',

    /**
     * Expression statement
     *
     * @see https://github.com/estree/estree/blob/master/es5.md#expressionstatement
     */
    EXPRESSION_STATEMENT: 'ExpressionStatement',

    /**
     * Literal value (string, number, boolean, null)
     *
     * @see https://github.com/estree/estree/blob/master/es5.md#literal
     */
    LITERAL: 'Literal',

    /**
     * Identifier (e.g., variable name)
     *
     * @see https://github.com/estree/estree/blob/master/es5.md#identifier
     */
    IDENTIFIER: 'Identifier',

    /**
     * Array expression (e.g., [1, 2, 3])
     *
     * @see https://github.com/estree/estree/blob/master/es5.md#arrayexpression
     */
    ARRAY_EXPRESSION: 'ArrayExpression',

    /**
     * Object expression (e.g., { key: value })
     *
     * @see https://github.com/estree/estree/blob/master/es5.md#objectexpression
     */
    OBJECT_EXPRESSION: 'ObjectExpression',

    /**
     * Property within an object
     *
     * @see https://github.com/estree/estree/blob/master/es5.md#property
     */
    PROPERTY: 'Property',

    /**
     * JSX fragment
     *
     * @see https://github.com/estree/estree/blob/master/es2020.md#jsxfragment
     */
    JSX_FRAGMENT: 'JSXFragment',
  },
};

// These positions are explicity before anything else
export const OVERRIDDEN_POSITIONS = [
  'index', // https://github.com/nodejs/node/blob/main/doc/api/index.md
  'synopsis', // https://github.com/nodejs/node/blob/main/doc/api/synopsis.md
  'documentation', // https://github.com/nodejs/node/blob/main/doc/api/documentation.md
];

// These types are methods, and have signatures we should enumerate
export const TYPES_WITH_METHOD_SIGNATURES = [
  'class',
  'ctor',
  'method',
  'classMethod',
];

export const TRIMMABLE_PADDING_REGEX = /^[\s:]+/;
