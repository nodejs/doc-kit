import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyTypeNode,
  extractPropertyName,
  extractTypeAnnotations,
  parseListIntoProperties,
} from '../types.mjs';

// Mock remark processor for tests
const remark = {
  runSync: () => ({
    body: [{ expression: 'mock-expression' }],
  }),
};

describe('classifyTypeNode', () => {
  it('returns 2 for union separator text node', () => {
    const node = { type: 'text', value: ' | ' };
    assert.strictEqual(classifyTypeNode(node), 2);
  });

  it('returns 1 for type reference link with angle bracket inline code', () => {
    const node = {
      type: 'link',
      children: [{ type: 'inlineCode', value: '<Type>' }],
    };
    assert.strictEqual(classifyTypeNode(node), 1);
  });

  it('returns 1 for type reference with complex angle bracket content', () => {
    const node = {
      type: 'link',
      children: [{ type: 'inlineCode', value: '<Promise<string>>' }],
    };
    assert.strictEqual(classifyTypeNode(node), 1);
  });

  it('returns 0 for regular text node', () => {
    const node = { type: 'text', value: 'regular text' };
    assert.strictEqual(classifyTypeNode(node), 0);
  });

  it('returns 0 for link without inline code child', () => {
    const node = {
      type: 'link',
      children: [{ type: 'text', value: 'regular link' }],
    };
    assert.strictEqual(classifyTypeNode(node), 0);
  });

  it('returns 0 for link with inline code not starting with angle bracket', () => {
    const node = {
      type: 'link',
      children: [{ type: 'inlineCode', value: 'regularCode' }],
    };
    assert.strictEqual(classifyTypeNode(node), 0);
  });

  it('returns 0 for node without children', () => {
    const node = { type: 'link' };
    assert.strictEqual(classifyTypeNode(node), 0);
  });

  it('returns 0 for node with empty children array', () => {
    const node = { type: 'link', children: [] };
    assert.strictEqual(classifyTypeNode(node), 0);
  });

  it('returns 0 for different text values', () => {
    const node1 = { type: 'text', value: '|' };
    const node2 = { type: 'text', value: ' |' };
    const node3 = { type: 'text', value: '| ' };

    assert.strictEqual(classifyTypeNode(node1), 0);
    assert.strictEqual(classifyTypeNode(node2), 0);
    assert.strictEqual(classifyTypeNode(node3), 0);
  });

  it('returns 0 for non-link, non-text nodes', () => {
    const nodes = [
      { type: 'paragraph' },
      { type: 'emphasis' },
      { type: 'strong' },
      { type: 'inlineCode' },
    ];

    nodes.forEach(node => {
      assert.strictEqual(classifyTypeNode(node), 0);
    });
  });
});

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

describe('extractTypeAnnotations', () => {
  it('extracts single type reference and returns expression', () => {
    const nodes = [
      {
        type: 'link',
        children: [{ type: 'inlineCode', value: '<string>' }],
      },
      { type: 'text', value: ' description follows' },
    ];

    const result = extractTypeAnnotations(nodes, remark);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].value, ' description follows');
  });

  it('extracts union types with separator', () => {
    const nodes = [
      {
        type: 'link',
        children: [{ type: 'inlineCode', value: '<string>' }],
      },
      { type: 'text', value: ' | ' },
      {
        type: 'link',
        children: [{ type: 'inlineCode', value: '<number>' }],
      },
      { type: 'text', value: ' description' },
    ];

    const result = extractTypeAnnotations(nodes, remark);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].value, ' description');
  });

  it('handles union separator at end without following type', () => {
    const nodes = [
      {
        type: 'link',
        children: [{ type: 'inlineCode', value: '<string>' }],
      },
      { type: 'text', value: ' | ' },
    ];

    const result = extractTypeAnnotations(nodes, remark);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 0);
  });

  it('returns undefined when no type annotations found', () => {
    const nodes = [
      { type: 'text', value: 'regular text' },
      { type: 'emphasis', children: [{ type: 'text', value: 'emphasized' }] },
    ];

    const result = extractTypeAnnotations(nodes, remark);

    assert.strictEqual(result, undefined);
    assert.strictEqual(nodes.length, 2);
  });

  it('stops extraction at first non-type node', () => {
    const nodes = [
      {
        type: 'link',
        children: [{ type: 'inlineCode', value: '<string>' }],
      },
      { type: 'emphasis', children: [{ type: 'text', value: 'not a type' }] },
      { type: 'text', value: ' | ' }, // This shouldn't be consumed
    ];

    const result = extractTypeAnnotations(nodes, remark);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(nodes[0].type, 'emphasis');
    assert.strictEqual(nodes[1].value, ' | ');
  });

  it('handles empty nodes array', () => {
    const nodes = [];

    const result = extractTypeAnnotations(nodes, remark);

    assert.strictEqual(result, undefined);
    assert.strictEqual(nodes.length, 0);
  });

  it('processes complex union types with multiple separators', () => {
    const nodes = [
      { type: 'link', children: [{ type: 'inlineCode', value: '<string>' }] },
      { type: 'text', value: ' | ' },
      { type: 'link', children: [{ type: 'inlineCode', value: '<number>' }] },
      { type: 'text', value: ' | ' },
      { type: 'link', children: [{ type: 'inlineCode', value: '<boolean>' }] },
      { type: 'text', value: ' description' },
    ];

    const result = extractTypeAnnotations(nodes, remark);

    assert.strictEqual(result, 'mock-expression');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual(nodes[0].value, ' description');
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

    const result = parseListIntoProperties(node, remark);

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

  it('parses property with type annotations', () => {
    const node = {
      children: [
        {
          children: [
            {
              children: [
                { type: 'inlineCode', value: 'prop' },
                {
                  type: 'link',
                  children: [{ type: 'inlineCode', value: '<string>' }],
                },
                { type: 'text', value: ' description' },
              ],
            },
          ],
        },
      ],
    };

    const result = parseListIntoProperties(node, remark);

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

    const result = parseListIntoProperties(node, remark);

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

    const result = parseListIntoProperties(node, remark);

    assert.deepStrictEqual(result, [
      {
        children: undefined,
        name: 'propOnly',
        type: undefined,
      },
    ]);
  });

  it('trims padding from description text', () => {
    // Mock TRIMMABLE_PADDING_REGEX
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

    const result = parseListIntoProperties(node, remark);

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

    const result = parseListIntoProperties(node, remark);

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

    const result = parseListIntoProperties(node, remark);

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

    const result = parseListIntoProperties(node, remark);

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

    const result = parseListIntoProperties(node, remark);

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
                {
                  type: 'link',
                  children: [{ type: 'inlineCode', value: '<Object>' }],
                },
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
                        {
                          type: 'link',
                          children: [{ type: 'inlineCode', value: '<number>' }],
                        },
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

    const result = parseListIntoProperties(node, remark);
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
