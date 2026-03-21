import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AST_NODE_TYPES } from '../../constants.mjs';
import { toESTree, createJSXElement, createAttributeNode } from '../ast.mjs';

describe('toESTree', () => {
  it('preserves existing JSX fragment nodes', () => {
    const fragment = { type: AST_NODE_TYPES.ESTREE.JSX_FRAGMENT };
    assert.equal(toESTree(fragment), fragment);
  });

  it('handles undefined', () => {
    const result = toESTree(undefined);
    assert.equal(result.type, AST_NODE_TYPES.ESTREE.IDENTIFIER);
    assert.equal(result.name, 'undefined');
  });

  it('handles null', () => {
    const result = toESTree(null);
    assert.equal(result.type, AST_NODE_TYPES.ESTREE.LITERAL);
    assert.equal(result.value, null);
  });

  it('handles string values', () => {
    const result = toESTree('test');
    assert.equal(result.type, AST_NODE_TYPES.ESTREE.LITERAL);
    assert.equal(result.value, 'test');
  });

  it('handles number values', () => {
    const result = toESTree(42);
    assert.equal(result.type, AST_NODE_TYPES.ESTREE.LITERAL);
    assert.equal(result.value, 42);
  });

  it('handles boolean values', () => {
    const result = toESTree(true);
    assert.equal(result.type, AST_NODE_TYPES.ESTREE.LITERAL);
    assert.equal(result.value, true);
  });

  it('handles arrays', () => {
    const result = toESTree([1, 2]);
    assert.equal(result.type, AST_NODE_TYPES.ESTREE.ARRAY_EXPRESSION);
    assert.equal(result.elements.length, 2);
    assert.equal(result.elements[0].value, 1);
    assert.equal(result.elements[1].value, 2);
  });

  it('handles objects', () => {
    const result = toESTree({ a: 1 });
    assert.equal(result.type, AST_NODE_TYPES.ESTREE.OBJECT_EXPRESSION);
    assert.equal(result.properties.length, 1);
    assert.equal(result.properties[0].key.name, 'a');
    assert.equal(result.properties[0].value.value, 1);
  });
});

describe('createJSXElement', () => {
  it('creates inline element by default', () => {
    const result = createJSXElement('div');
    assert.equal(result.type, AST_NODE_TYPES.MDX.JSX_INLINE_ELEMENT);
    assert.equal(result.name, 'div');
  });

  it('creates block element when specified', () => {
    const result = createJSXElement('div', { inline: false });
    assert.equal(result.type, AST_NODE_TYPES.MDX.JSX_BLOCK_ELEMENT);
  });

  it('handles string children', () => {
    const result = createJSXElement('div', { children: 'text' });
    assert.equal(result.children.length, 1);
    assert.equal(result.children[0].value, 'text');
  });

  it('handles array children', () => {
    const children = [{ type: 'text', value: 'test' }];
    const result = createJSXElement('div', { children });
    assert.deepEqual(result.children, children);
  });

  it('handles attributes', () => {
    const result = createJSXElement('div', { id: 'test' });
    assert.equal(result.attributes.length, 1);
    assert.equal(result.attributes[0].name, 'id');
    assert.equal(result.attributes[0].value, 'test');
  });
});

describe('createAttributeNode', () => {
  it('handles string values', () => {
    const result = createAttributeNode('id', 'test');
    assert.equal(result.name, 'id');
    assert.equal(result.value, 'test');
  });

  it('handles number values', () => {
    const result = createAttributeNode('count', 5);
    assert.equal(result.value, '5');
  });

  it('handles boolean values', () => {
    const result = createAttributeNode('enabled', true);
    assert.equal(result.value, 'true');
  });

  it('handles null values', () => {
    const result = createAttributeNode('data', null);
    assert.equal(result.value, null);
  });

  it('handles object values', () => {
    const result = createAttributeNode('data', { a: 1 });
    assert.equal(
      result.value.type,
      AST_NODE_TYPES.MDX.JSX_ATTRIBUTE_EXPRESSION
    );
    const estree = result.value.data.estree;
    assert.equal(
      estree.body[0].expression.type,
      AST_NODE_TYPES.ESTREE.OBJECT_EXPRESSION
    );
  });

  it('handles array values', () => {
    const result = createAttributeNode('items', [1, 2]);
    assert.equal(
      result.value.type,
      AST_NODE_TYPES.MDX.JSX_ATTRIBUTE_EXPRESSION
    );
    const estree = result.value.data.estree;
    assert.equal(
      estree.body[0].expression.type,
      AST_NODE_TYPES.ESTREE.ARRAY_EXPRESSION
    );
  });
});
