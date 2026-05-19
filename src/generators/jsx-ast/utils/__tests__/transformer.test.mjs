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
});
