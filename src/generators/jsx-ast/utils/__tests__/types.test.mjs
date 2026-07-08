import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Mock remark
mock.module('../../../../utils/remark.mjs', {
  namedExports: {
    getRemarkRecma: () => ({
      runSync: () => ({
        body: [{ expression: 'mock-expression' }],
      }),
    }),
  },
});

const { extractPropertyName, extractTypeAnnotation, parseListIntoProperties } =
  await import('../types.mjs');

describe('extractPropertyName', () => {
  it('extracts name from inline code and removes it from nodes', () => {
    const nodes = [
      { type: 'inlineCode', value: 'propName' },
      { type: 'text', value: ' remaining text' },
    ];
    const current = {};

    extractPropertyName(nodes, current);

    assert.deepStrictEqual(current, { name: 'propName' });
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].value, ' remaining text');
  });

  it('trims trailing whitespace from inline code value', () => {
    const nodes = [{ type: 'inlineCode', value: 'propName   ' }];
    const current = {};

    extractPropertyName(nodes, current);

    assert.deepStrictEqual(current, { name: 'propName' });
    assert.strictEqual(nodes.length, 0);
  });

  it('handles empty nodes array gracefully', () => {
    const nodes = [];
    const current = {};

    extractPropertyName(nodes, current);

    assert.deepStrictEqual(current, {});
    assert.strictEqual(nodes.length, 0);
  });

  it('does nothing when first node is not text or inlineCode', () => {
    const nodes = [
      { type: 'emphasis', children: [{ type: 'text', value: 'emphasized' }] },
    ];
    const current = {};

    extractPropertyName(nodes, current);

    assert.deepStrictEqual(current, {});
    assert.strictEqual(nodes.length, 1);
  });

  describe('text node processing', () => {
    it('extracts "Returns" and sets kind to "return"', () => {
      const nodes = [{ type: 'text', value: 'Returns: description here' }];
      const current = {};

      extractPropertyName(nodes, current);

      assert.deepStrictEqual(current, { name: 'Returns', kind: 'return' });
      assert.strictEqual(nodes[0].value, 'description here');
    });

    it('preserves node with remaining non-whitespace content', () => {
      const nodes = [{ type: 'text', value: 'Returns: some content' }];
      const current = {};

      extractPropertyName(nodes, current);

      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].value, 'some content');
    });

    it('does nothing when text does not match typed list starters', () => {
      const nodes = [{ type: 'text', value: 'regular text without colon' }];
      const current = {};

      extractPropertyName(nodes, current);

      assert.deepStrictEqual(current, {});
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual(nodes[0].value, 'regular text without colon');
    });
  });
});

describe('extractTypeAnnotation', () => {
  it('extracts a leading type annotation and returns its expression', () => {
    const nodes = [
      { type: 'typeAnnotation', value: 'string' },
      { type: 'text', value: ' description follows' },
    ];

    const result = extractTypeAnnotation(nodes);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].value, ' description follows');
  });

  it('extracts union types written as one annotation', () => {
    const nodes = [
      { type: 'typeAnnotation', value: 'string|number' },
      { type: 'text', value: ' description' },
    ];

    const result = extractTypeAnnotation(nodes);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].value, ' description');
  });

  it('returns undefined when no type annotation leads', () => {
    const nodes = [
      { type: 'text', value: 'regular text' },
      { type: 'typeAnnotation', value: 'string' },
    ];

    const result = extractTypeAnnotation(nodes);

    assert.strictEqual(result, undefined);
    assert.strictEqual(nodes.length, 2);
  });

  it('consumes only the leading annotation', () => {
    const nodes = [
      { type: 'typeAnnotation', value: 'string' },
      { type: 'emphasis', children: [{ type: 'text', value: 'not a type' }] },
      { type: 'typeAnnotation', value: 'number' },
    ];

    const result = extractTypeAnnotation(nodes);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(nodes[0].type, 'emphasis');
  });

  it('handles empty nodes array', () => {
    const nodes = [];

    const result = extractTypeAnnotation(nodes);

    assert.strictEqual(result, undefined);
    assert.strictEqual(nodes.length, 0);
  });
});

describe('parseListIntoProperties', () => {
  it('parses simple property with inline code name', () => {
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'propName' },
                { type: 'text', value: ' description here' },
              ],
            },
          ],
        },
      ],
    };

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
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'prop' },
                { type: 'typeAnnotation', value: 'string' },
                { type: 'text', value: ' description' },
              ],
            },
          ],
        },
      ],
    };

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

  it('detects optional properties with default expressions', () => {
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'optionalProp' },
                { type: 'text', value: ' optional parameter description' },
              ],
            },
          ],
        },
      ],
    };

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        name: 'optionalProp',
        optional: false,
        type: undefined,
      },
    ]);
  });

  it('handles properties without descriptions', () => {
    const node = {
      children: [
        {
          children: [
            {
              children: [{ type: 'inlineCode', value: 'propOnly' }],
            },
          ],
        },
      ],
    };

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
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'prop' },
                { type: 'text', value: '   - description with padding' },
              ],
            },
          ],
        },
      ],
    };

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
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'first' },
                { type: 'text', value: ' first description' },
              ],
            },
          ],
        },
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'second' },
                { type: 'text', value: ' second description' },
              ],
            },
          ],
        },
      ],
    };

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

  it('handles properties with typed list starters', () => {
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'text', value: 'Returns: result description' },
              ],
            },
          ],
        },
      ],
    };

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        description: 'mock-expression',
        kind: 'return',
        name: 'Returns',
        optional: false,
        type: undefined,
      },
    ]);
  });

  it('handles empty list', () => {
    const node = {
      children: [],
    };

    const result = parseListIntoProperties(node);

    assert.deepStrictEqual(result, []);
  });

  it('handles complex nested structure', () => {
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'config' },
                { type: 'typeAnnotation', value: 'Object' },
                { type: 'text', value: ' configuration object' },
              ],
            },
            {
              type: 'list',
              children: [
                {
                  children: [
                    {
                      children: [
                        { type: 'inlineCode', value: 'timeout' },
                        { type: 'typeAnnotation', value: 'number' },
                        { type: 'text', value: ' timeout in milliseconds' },
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
            name: 'timeout',
            optional: false,
            type: 'mock-expression',
          },
        ],
        description: 'mock-expression',
        name: 'config',
        optional: false,
        type: 'mock-expression',
      },
    ]);
  });
});
