import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const codeToHast = mock.fn((code, { lang }) => ({
  children: [
    {
      type: 'element',
      tagName: 'pre',
      properties: { class: 'shiki', style: `lang:${lang}` },
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: { class: 'code' },
          children: [{ type: 'text', value: code }],
        },
      ],
    },
  ],
}));

mock.module('@node-core/rehype-shiki', {
  defaultExport: async () => ({ shiki: { codeToHast } }),
});

const rehypeShikiji = (await import('../highlighter.mjs')).default;

describe('utils/highlighter rehypeShikiji', () => {
  it('highlights <pre><code className=[language-*]>', () => {
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
              properties: { className: ['language-js'] },
              children: [{ type: 'text', value: 'const a = 1' }],
            },
          ],
        },
        // ignored: missing className
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              children: [{ type: 'text', value: 'noop' }],
            },
          ],
        },
      ],
    };

    rehypeShikiji()(tree);

    assert.equal(codeToHast.mock.callCount(), 1);

    const highlighted = tree.children[0];
    assert.equal(highlighted.tagName, 'pre');
    assert.match(highlighted.properties.class, /language-js/);

    // Copy button added
    const copyButton = highlighted.children[highlighted.children.length - 1];
    assert.equal(copyButton.tagName, 'button');
  });

  it('creates switchable code tab for two code blocks', () => {
    const makePre = language => ({
      type: 'element',
      tagName: 'pre',
      properties: { class: `language-${language}`, style: 's' },
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: {},
          children: [{ type: 'text', value: `// ${language}` }],
        },
      ],
    });

    const tree = {
      type: 'root',
      children: [makePre('cjs'), makePre('mjs')],
    };

    rehypeShikiji()(tree);

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
    assert.equal(first.children.filter(n => n.tagName === 'code').length, 2);
    assert.equal(first.children[first.children.length - 1].tagName, 'button');
  });
});
