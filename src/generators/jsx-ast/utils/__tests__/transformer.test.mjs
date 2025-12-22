import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import createTransformer from '../transformer.mjs';

describe('jsx-ast/utils/transformer', () => {
  it('wraps tables, applies data-labels, transforms tags, and moves footnotes', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'pre', properties: {}, children: [] },
        {
          type: 'element',
          tagName: 'table',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'thead',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'tr',
                  properties: {},
                  children: [
                    {
                      type: 'element',
                      tagName: 'th',
                      properties: {},
                      children: [{ type: 'text', value: 'A' }],
                    },
                    {
                      type: 'element',
                      tagName: 'th',
                      properties: {},
                      children: [{ type: 'text', value: 'B' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'element',
              tagName: 'tbody',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'tr',
                  properties: {},
                  children: [
                    {
                      type: 'element',
                      tagName: 'td',
                      properties: {},
                      children: [{ type: 'text', value: '1' }],
                    },
                    {
                      type: 'element',
                      tagName: 'td',
                      properties: {},
                      children: [{ type: 'text', value: '2' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          // document layout-ish placeholder: tree.children[2]?.children[1]?.children[0]?.children
          type: 'element',
          tagName: 'article',
          properties: {},
          children: [
            { type: 'element', tagName: 'aside', properties: {}, children: [] },
            {
              type: 'element',
              tagName: 'div',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'main',
                  properties: {},
                  children: [],
                },
              ],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'section',
          properties: {},
          children: [
            { type: 'element', tagName: 'p', properties: {}, children: [] },
          ],
        },
      ],
    };

    const transformer = createTransformer();
    transformer(tree);

    // pre -> CodeBox
    assert.equal(tree.children[0].tagName, 'CodeBox');

    // table wrapped in overflow container
    assert.equal(tree.children[1].tagName, 'div');
    assert.equal(
      tree.children[1].properties.className[0],
      'overflow-container'
    );

    const table = tree.children[1].children[0];
    const tbody = table.children.find(n => n.tagName === 'tbody');
    const firstRow = tbody.children[0];

    assert.equal(firstRow.children[0].properties['data-label'], 'A');
    assert.equal(firstRow.children[1].properties['data-label'], 'B');

    // footnotes section moved into main
    const main = tree.children[2].children[1].children[0];
    assert.equal(main.children.length, 1);
  });
});
