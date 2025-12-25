import { strictEqual, deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { u as createTree } from 'unist-builder';

import typeMap from '../../parser/typeMap.json' with { type: 'json' };
import createQueries from '../index.mjs';

describe('createQueries', () => {
  const queries = createQueries(typeMap);

  it('should add YAML metadata correctly', () => {
    const node = createTree('text', 'type: test\nname: test\n');
    const apiEntryMetadata = {
      updateProperties: properties => {
        deepStrictEqual(properties, { type: 'test', name: 'test' });
      },
    };

    queries.addYAMLMetadata(node, apiEntryMetadata);
  });

  it('should update type to reference correctly', () => {
    const node = createTree(
      'text',
      { start: 0, end: 0 },
      'This is a {string} type.'
    );
    const parent = createTree('paragraph', [node]);

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

  it('should not update type reference if no match', () => {
    const node = createTree(
      'text',
      { start: 0, end: 0 },
      'This is a {test} type.'
    );

    const parent = createTree('paragraph', [node]);

    queries.updateTypeReference(node, parent);

    strictEqual(parent.children[0].type, 'text');
    strictEqual(parent.children[0].value, 'This is a {test} type.');
  });

  it('should add heading metadata correctly', () => {
    const node = createTree('heading', { depth: 2 }, [
      createTree('text', 'Test Heading'),
    ]);

    const apiEntryMetadata = {
      setHeading: heading =>
        deepStrictEqual(heading.data, {
          depth: 2,
          name: 'Test Heading',
          text: 'Test Heading',
        }),
    };

    queries.setHeadingMetadata(node, apiEntryMetadata);
  });

  it('should update markdown link correctly', () => {
    const node = createTree('link', { url: 'test.md#heading' }, []);

    queries.updateMarkdownLink(node);
    strictEqual(node.url, 'test.html#heading');
  });

  it('should update link reference correctly', () => {
    const node = createTree('linkReference', { identifier: 'test' });

    const definitions = [
      {
        ...node,
        url: 'test.html#test',
      },
    ];

    console.log(node, definitions);
    queries.updateLinkReference(node, definitions);

    strictEqual(node.type, 'link');
    strictEqual(node.url, 'test.html#test');
  });

  it('should add stability index metadata correctly', () => {
    const node = createTree('blockquote', [
      createTree('paragraph', [createTree('text', 'Stability: 1.0 - Frozen')]),
    ]);

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
    describe('isStronglyTypedList', () => {
      it('returns false for non-list nodes', () => {
        strictEqual(
          createQueries.UNIST.isStronglyTypedList(createTree('paragraph', [])),
          false
        );
      });

      it('returns false for empty lists', () => {
        strictEqual(
          createQueries.UNIST.isStronglyTypedList(createTree('list', [])),
          false
        );
      });

      const cases = [
        {
          name: 'typedListStarters pattern match',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [createTree('text', 'Returns: foo')]),
            ]),
          ]),
          expected: true,
        },
        {
          name: 'direct type link pattern',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [
                createTree('link', [createTree('inlineCode', '<Type>')]),
              ]),
            ]),
          ]),
          expected: true,
        },
        {
          name: 'inlineCode + space + type link pattern',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [
                createTree('inlineCode', 'foo'),
                createTree('text', ' '),
                createTree('link', [createTree('text', '<Bar>')]),
              ]),
            ]),
          ]),
          expected: true,
        },
        {
          name: 'non-matching content',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [
                createTree('inlineCode', 'not a valid prop'),
                createTree('text', ' '),
                createTree('link', [createTree('text', '<Bar>')]),
              ]),
            ]),
          ]),
          expected: false,
        },
      ];

      cases.forEach(({ name, node, expected }) => {
        it(`returns ${expected} for ${name}`, () => {
          strictEqual(createQueries.UNIST.isStronglyTypedList(node), expected);
        });
      });
    });

    describe('isLooselyTypedList', () => {
      it('returns false for non-list nodes', () => {
        strictEqual(
          createQueries.UNIST.isStronglyTypedList(createTree('paragraph', [])),
          false
        );
      });

      it('returns false for empty lists', () => {
        strictEqual(
          createQueries.UNIST.isStronglyTypedList(createTree('list', [])),
          false
        );
      });

      const cases = [
        {
          name: 'typedListStarters pattern match',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [createTree('text', 'Returns: foo')]),
            ]),
          ]),
          expected: true,
        },
        {
          name: 'direct type link pattern',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [
                createTree('link', [createTree('inlineCode', '<Type>')]),
              ]),
            ]),
          ]),
          expected: true,
        },
        {
          name: 'inlineCode + text pattern',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [
                createTree('inlineCode', 'foo'),
                createTree('text', ' bar'),
              ]),
            ]),
          ]),
          expected: true,
        },
        {
          name: 'non-matching content',
          node: createTree('list', [
            createTree('listItem', [
              createTree('paragraph', [
                createTree('inlineCode', 'not a valid prop'),
                createTree('text', ' '),
                createTree('link', [createTree('text', '<Bar>')]),
              ]),
            ]),
          ]),
          expected: false,
        },
      ];

      cases.forEach(({ name, node, expected }) => {
        it(`returns ${expected} for ${name}`, () => {
          strictEqual(createQueries.UNIST.isLooselyTypedList(node), expected);
        });
      });
    });
  });
});
