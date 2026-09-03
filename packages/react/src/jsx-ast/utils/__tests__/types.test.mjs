import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Mock remark
mock.module('../remark.mjs', {
  namedExports: {
    getRemarkRecma: () => ({
      runSync: () => ({
        body: [{ expression: 'mock-expression' }],
      }),
    }),
  },
});

const { parseListIntoProperties } = await import('../types.mjs');

const list = (...items) => ({
  children: items.map(children => ({ children: [{ children }] })),
});

describe('parseListIntoProperties', () => {
  it('parses simple property with inline code name', () => {
    const node = list([
      { type: 'inlineCode', value: 'propName' },
      { type: 'text', value: ' description here' },
    ]);

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        name: 'propName',
        optional: false,
        type: undefined,
      },
    ]);
  });

  it('parses property with a type annotation', () => {
    const node = list([
      { type: 'inlineCode', value: 'prop' },
      { type: 'typeAnnotation', value: 'string' },
      { type: 'text', value: ' description' },
    ]);

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        name: 'prop',
        optional: false,
        type: 'mock-expression',
      },
    ]);
  });

  it('marks properties with a default value as optional', () => {
    const node = list([
      { type: 'inlineCode', value: 'encoding' },
      { type: 'typeAnnotation', value: 'string' },
      { type: 'text', value: ' The encoding. ' },
      { type: 'strong', children: [{ type: 'text', value: 'Default:' }] },
      { type: 'text', value: ' ' },
      { type: 'inlineCode', value: "'utf8'" },
    ]);

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        name: 'encoding',
        optional: true,
        type: 'mock-expression',
      },
    ]);
  });

  it('names return items after their prefix and gives them a kind', () => {
    const node = list([
      { type: 'text', value: 'Returns: ' },
      { type: 'typeAnnotation', value: 'Promise' },
      { type: 'text', value: ' Fulfills on close.' },
    ]);

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        kind: 'return',
        name: 'Returns',
        optional: false,
        type: 'mock-expression',
      },
    ]);
  });

  it('handles properties without descriptions', () => {
    const node = list([{ type: 'inlineCode', value: 'propOnly' }]);

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        name: 'propOnly',
        type: undefined,
      },
    ]);
  });

  it('trims padding from description text', () => {
    const node = list([
      { type: 'inlineCode', value: 'prop' },
      { type: 'text', value: '   - description with padding' },
    ]);

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        name: 'prop',
        optional: false,
        type: undefined,
      },
    ]);
  });

  it('processes nested list items as children', () => {
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'parent' },
                { type: 'text', value: ' parent description' },
              ],
            },
            {
              type: 'list',
              children: [
                {
                  children: [
                    {
                      children: [
                        { type: 'inlineCode', value: 'child' },
                        { type: 'text', value: ' child description' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: [
          {
            children: undefined,
            description: 'mock-expression',
            name: 'child',
            optional: false,
            type: undefined,
          },
        ],
        description: 'mock-expression',
        name: 'parent',
        optional: false,
        type: undefined,
      },
    ]);
  });

  it('handles multiple list items', () => {
    const node = list(
      [
        { type: 'inlineCode', value: 'first' },
        { type: 'text', value: ' first description' },
      ],
      [
        { type: 'inlineCode', value: 'second' },
        { type: 'text', value: ' second description' },
      ]
    );

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        name: 'first',
        optional: false,
        type: undefined,
      },
      {
        children: undefined,
        description: 'mock-expression',
        name: 'second',
        optional: false,
        type: undefined,
      },
    ]);
  });
});
