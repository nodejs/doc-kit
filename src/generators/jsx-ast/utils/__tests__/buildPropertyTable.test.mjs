import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

// Avoid importing heavy query/remark/highlighter dependencies.
mock.module('../../../../utils/queries/index.mjs', {
  defaultExport: {
    QUERIES: {
      typedListStarters: /^(Returns|Extends|Type):?\s*/,
    },
    UNIST: {
      isTypedList: node => node.type === 'list' && node.data?.typed,
    },
  },
});

const {
  default: createPropertyTable,
  classifyTypeNode,
  extractPropertyName,
  extractTypeAnnotations,
  parseListIntoProperties,
} = await import('../buildPropertyTable.mjs');

describe('classifyTypeNode', () => {
  it('identifies union separator', () => {
    assert.equal(classifyTypeNode({ type: 'text', value: ' | ' }), 2);
  });

  it('identifies type reference', () => {
    assert.equal(
      classifyTypeNode({
        type: 'link',
        children: [{ type: 'inlineCode', value: '<string>' }],
      }),
      1
    );
  });

  it('returns 0 for non-type nodes', () => {
    assert.equal(classifyTypeNode({ type: 'text', value: 'regular text' }), 0);
  });

  it('returns 0 for link nodes that are not type references', () => {
    assert.equal(
      classifyTypeNode({
        type: 'link',
        children: [{ type: 'inlineCode', value: 'not-a-type' }],
      }),
      0
    );
    assert.equal(
      classifyTypeNode({
        type: 'link',
        children: [{ type: 'text', value: '<string>' }],
      }),
      0
    );
  });
});

describe('extractPropertyName', () => {
  it('returns undefined for empty children', () => {
    const children = [];
    const result = extractPropertyName(children);
    assert.equal(result, undefined);
  });

  it('extracts name from inlineCode', () => {
    const children = [{ type: 'inlineCode', value: 'propName ' }];
    const result = extractPropertyName(children);
    assert.equal(result.tagName, 'code');
    assert.equal(result.children[0].value, 'propName');
  });

  it('extracts starters and trims matched prefix', () => {
    const children = [{ type: 'text', value: 'Returns: something' }];
    const result = extractPropertyName(children);
    assert.equal(result, 'Returns');
    assert.equal(children[0].value.trimStart().startsWith('something'), true);
  });

  it("returns false for 'Type' starter and removes empty text node", () => {
    const children = [{ type: 'text', value: 'Type:' }];
    const result = extractPropertyName(children);
    assert.equal(result, false);
    assert.equal(children.length, 0);
  });

  it('returns undefined when no starter matches', () => {
    const children = [{ type: 'text', value: 'NotAStarter: foo' }];
    const result = extractPropertyName(children);
    assert.equal(result, undefined);
    assert.equal(children.length, 1);
  });
});

describe('extractTypeAnnotations', () => {
  it('extracts union type nodes until non-type node', () => {
    const children = [
      { type: 'link', children: [{ type: 'inlineCode', value: '<A>' }] },
      { type: 'text', value: ' | ' },
      { type: 'link', children: [{ type: 'inlineCode', value: '<B>' }] },
      { type: 'text', value: ' - description' },
    ];

    const result = extractTypeAnnotations(children);

    assert.equal(result.length, 3);
    assert.equal(children.length, 1);
    assert.equal(children[0].value, ' - description');
  });

  it('includes the node following a union separator (even if non-type)', () => {
    const children = [
      { type: 'link', children: [{ type: 'inlineCode', value: '<A>' }] },
      { type: 'text', value: ' | ' },
      { type: 'text', value: 'not a type' },
      { type: 'text', value: ' trailing' },
    ];

    const result = extractTypeAnnotations(children);

    assert.equal(result.length, 3);
    assert.equal(children.length, 1);
    assert.equal(children[0].value, ' trailing');
  });

  it('returns empty array for no type nodes', () => {
    const children = [{ type: 'text', value: 'just text' }];
    const result = extractTypeAnnotations(children);
    assert.equal(result.length, 0);
    assert.equal(children.length, 1);
  });
});

describe('parseListIntoProperties', () => {
  it('parses list items and retains nested typed sublists', () => {
    const node = {
      type: 'list',
      children: [
        {
          type: 'listItem',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'inlineCode', value: 'foo' },
                { type: 'text', value: ' ' },
                {
                  type: 'link',
                  children: [{ type: 'inlineCode', value: '<string>' }],
                },
                { type: 'text', value: '  description' },
              ],
            },
            {
              type: 'list',
              data: { typed: true },
              children: [],
            },
          ],
        },
      ],
    };

    const props = parseListIntoProperties(node);
    assert.equal(props.length, 1);
    assert.ok(props[0].name);
    assert.equal(props[0].types.length, 1);
    assert.equal(props[0].sublist.type, 'list');
    assert.equal(props[0].desc[0].value.startsWith('description'), true);
  });

  it('handles Type-only items with empty description/types fallback', () => {
    const node = {
      type: 'list',
      children: [
        {
          type: 'listItem',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Type:' }],
            },
          ],
        },
      ],
    };

    const props = parseListIntoProperties(node);
    assert.equal(props.length, 1);
    assert.equal(props[0].name, false);
    assert.equal(props[0].types.length, 0);
    assert.equal(props[0].desc.length, 0);
    assert.equal(props[0].sublist, undefined);
  });
});

describe('createPropertyTable', () => {
  it('creates a table with headings by default', () => {
    const node = {
      type: 'list',
      children: [
        {
          type: 'listItem',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'inlineCode', value: 'propName' }],
            },
          ],
        },
      ],
    };

    const result = createPropertyTable(node);
    assert.equal(result.tagName, 'table');
    assert.ok(result.children.find(child => child.tagName === 'thead'));
    assert.ok(result.children.find(child => child.tagName === 'tbody'));
  });

  it('creates a table without headings when specified', () => {
    const node = {
      type: 'list',
      children: [
        {
          type: 'listItem',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'inlineCode', value: 'propName' }],
            },
          ],
        },
      ],
    };

    const result = createPropertyTable(node, false);

    assert.equal(result.tagName, 'table');
    assert.ok(!result.children.find(child => child.tagName === 'thead'));
    assert.equal(result.children[0].tagName, 'tr');
  });

  it('renders dashes for empty cells (name/types/desc)', () => {
    const node = {
      type: 'list',
      children: [
        {
          type: 'listItem',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', value: 'Type:' }],
            },
          ],
        },
      ],
    };

    const result = createPropertyTable(node);
    const tbody = result.children.find(child => child.tagName === 'tbody');
    const row = tbody.children[0];
    assert.equal(row.tagName, 'tr');
    assert.equal(row.children[0].children[0].value, '-');
    assert.equal(row.children[1].children[0].value, '-');
    assert.equal(row.children[2].children[0].value, '-');
  });
});
