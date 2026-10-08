import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toHtml } from 'hast-util-to-html';

import { createHighlighter } from '../highlighter.mjs';
import { load } from '../rehype.mjs';

describe('load', () => {
  it('gives the plugin highlighting code blocks, with its highlighter', async () => {
    const shiki = await load({ langAlias: { conf: 'ini' } });

    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: { className: ['language-conf'] },
              children: [{ type: 'text', value: '[section]' }],
            },
          ],
        },
      ],
    };

    shiki()(tree);

    assert.match(toHtml(tree), /class="shiki/);
    assert.equal(
      shiki.highlighter,
      await createHighlighter({ langAlias: { conf: 'ini' } })
    );
  });
});
