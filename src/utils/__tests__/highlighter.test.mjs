import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import rehypeShikiji from '../highlighter.mjs';

describe('utils - highlighter', () => {
  it('handles pre elements with missing code child gracefully', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          children: [{ type: 'text', value: 'no code' }],
        },
      ],
    };

    const plugin = rehypeShikiji();
    // should not throw
    plugin(tree);
  });

  it('creates switchable code tab for two code blocks', () => {
    const code1 = { type: 'element', tagName: 'code', properties: {} };
    const pre1 = {
      type: 'element',
      tagName: 'pre',
      children: [code1],
      properties: { class: 'language-cjs', style: 's1' },
    };

    const code2 = { type: 'element', tagName: 'code', properties: {} };
    const pre2 = {
      type: 'element',
      tagName: 'pre',
      children: [code2],
      properties: { class: 'language-mjs', style: 's2' },
    };

    const tree = { type: 'root', children: [pre1, pre2] };

    const plugin = rehypeShikiji();
    plugin(tree);

    // first child should be replaced with a pre element (switchable container)
    const first = tree.children[0];
    assert.equal(first.tagName, 'pre');
    const hasShikiClass =
      (first.properties &&
        typeof first.properties.class === 'string' &&
        String(first.properties.class).includes('shiki')) ||
      (first.properties &&
        Array.isArray(first.properties.className) &&
        first.properties.className.includes('shiki'));
    assert.ok(hasShikiClass);
  });
});
