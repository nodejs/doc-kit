import { strictEqual, deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import typeMap from '../../parser/typeMap.json' with { type: 'json' };
import createQueries from '../index.mjs';

describe('createQueries', () => {
  const queries = createQueries(typeMap);

  it('should add YAML metadata correctly', () => {
    const node = { value: 'type: test\nname: test\n' };
    const apiEntryMetadata = {
      updateProperties: properties => {
        deepStrictEqual(properties, { type: 'test', name: 'test' });
      },
    };
    queries.addYAMLMetadata(node, apiEntryMetadata);
  });

  // valid type
  it('should update type to reference correctly', () => {
    const node = {
      value: 'This is a {string} type.',
      position: { start: 0, end: 0 },
    };
    const parent = { children: [node] };
    queries.updateTypeReference(node, parent);
    deepStrictEqual(
      parent.children.map(c => c.value),
      [
        'This is a ',
        undefined, // link
        ' type.',
      ]
    );
  });

  it('should update type to reference not correctly if no match', () => {
    const node = {
      value: 'This is a {test} type.',
      position: { start: 0, end: 0 },
    };
    const parent = { children: [node] };
    queries.updateTypeReference(node, parent);
    strictEqual(parent.children[0].type, 'text');
    strictEqual(parent.children[0].value, 'This is a {test} type.');
  });

  it('should add heading metadata correctly', () => {
    const node = {
      depth: 2,
      children: [{ type: 'text', value: 'Test Heading' }],
    };
    const apiEntryMetadata = {
      setHeading: heading => {
        deepStrictEqual(heading, {
          children: [
            {
              type: 'text',
              value: 'Test Heading',
            },
          ],
          data: {
            depth: 2,
            name: 'Test Heading',
            text: 'Test Heading',
          },
          depth: 2,
        });
      },
    };
    queries.setHeadingMetadata(node, apiEntryMetadata);
  });

  it('should update markdown link correctly', () => {
    const node = { type: 'link', url: 'test.md#heading' };
    queries.updateMarkdownLink(node);
    strictEqual(node.url, 'test.html#heading');
  });

  it('should update link reference correctly', () => {
    const node = { type: 'linkReference', identifier: 'test' };
    const definitions = [{ identifier: 'test', url: 'test.html#test' }];
    queries.updateLinkReference(node, definitions);
    strictEqual(node.type, 'link');
    strictEqual(node.url, 'test.html#test');
  });

  it('should add stability index metadata correctly', () => {
    const node = {
      type: 'blockquote',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Stability: 1.0 - Frozen' }],
        },
      ],
    };
    const apiEntryMetadata = {
      addStability: stability => {
        deepStrictEqual(stability.data, {
          index: '1.0',
          description: 'Frozen',
        });
      },
    };
    queries.addStabilityMetadata(node, apiEntryMetadata);
  });

  describe('UNIST', () => {
    describe('isTypedList', () => {
      it('returns false for non-list nodes', () => {
        strictEqual(
          createQueries.UNIST.isTypedList({ type: 'paragraph', children: [] }),
          false
        );
      });

      it('returns false for empty lists', () => {
        strictEqual(
          createQueries.UNIST.isTypedList({ type: 'list', children: [] }),
          false
        );
      });

      const cases = [
        {
          name: 'typedListStarters pattern match',
          node: {
            type: 'list',
            children: [
              {
                children: [
                  {
                    children: [{ type: 'text', value: 'Returns: foo' }],
                  },
                ],
              },
            ],
          },
          expected: true,
        },
        {
          name: 'direct type link pattern',
          node: {
            type: 'list',
            children: [
              {
                children: [
                  {
                    children: [
                      {
                        type: 'link',
                        children: [{ type: 'inlineCode', value: '<Type>' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          expected: true,
        },
        {
          name: 'inlineCode + space + type link pattern',
          node: {
            type: 'list',
            children: [
              {
                children: [
                  {
                    children: [
                      { type: 'inlineCode', value: 'foo' },
                      { type: 'text', value: ' ' },
                      {
                        type: 'link',
                        children: [{ type: 'text', value: '<Bar>' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          expected: true,
        },
        {
          name: 'non-matching content',
          node: {
            type: 'list',
            children: [
              {
                children: [
                  {
                    children: [
                      { type: 'inlineCode', value: 'not a valid prop' },
                      { type: 'text', value: ' ' },
                      {
                        type: 'link',
                        children: [{ type: 'text', value: '<Bar>' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          expected: false,
        },
      ];

      cases.forEach(({ name, node, expected }) => {
        it(`returns ${expected} for ${name}`, () => {
          strictEqual(createQueries.UNIST.isTypedList(node), expected);
        });
      });
    });
  });
});
