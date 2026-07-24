import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import transformer from '../transformer.mjs';

describe('jsx-ast transformer', () => {
  it('moves generated footnotes into the Layout children', () => {
    const layout = {
      type: 'mdxJsxTextElement',
      name: 'Layout',
      children: [{ type: 'element', tagName: 'p', children: [] }],
    };
    const footnotes = {
      type: 'element',
      tagName: 'section',
      properties: { dataFootnotes: '', className: ['footnotes'] },
      children: [
        {
          type: 'element',
          tagName: 'ol',
          children: [
            {
              type: 'element',
              tagName: 'li',
              properties: { id: 'user-content-fn-a' },
              children: [{ type: 'text', value: 'Footnote text' }],
            },
          ],
        },
      ],
    };
    const tree = {
      type: 'root',
      children: [layout, { type: 'text', value: '\n' }, footnotes],
    };

    transformer()(tree);

    assert.equal(tree.children.includes(footnotes), false);
    assert.equal(layout.children.at(-1), footnotes);
  });

  it('wraps tables in an overflow container and adds responsive labels', () => {
    const table = {
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
                  children: [{ type: 'text', value: 'Name' }],
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
                  children: [{ type: 'text', value: 'Alice' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const tree = {
      type: 'root',
      children: [table],
    };

    transformer()(tree);

    const wrapper = tree.children[0];

    assert.equal(wrapper.tagName, 'div');
    assert.deepEqual(wrapper.properties.className, ['overflow-container']);

    const transformedTable = wrapper.children[0];

    assert.equal(transformedTable.tagName, 'table');
    assert.equal(
      transformedTable.children[1].children[0].children[0].properties[
        'data-label'
      ],
      'Name'
    );
  });
});
