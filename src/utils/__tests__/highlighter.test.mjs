import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { h as createElement } from 'hastscript';

import rehypeShikiji, { highlighter } from '../highlighter.mjs';

test('highlighter - is created and available', () => {
  assert.ok(highlighter);
  assert.ok(highlighter.shiki);
  assert.ok(typeof highlighter.shiki.codeToHast === 'function');
});

test('rehypeShikiji - transforms code blocks with language', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: { className: ['language-javascript'] },
            children: [{ type: 'text', value: 'const x = 5;' }],
          },
        ],
      },
    ],
  };

  transformer(tree);

  // Should have replaced the original pre element
  const preElement = tree.children[0];
  assert.equal(preElement.tagName, 'pre');

  // Should have Shiki styling classes
  assert.ok(preElement.properties.class.includes('shiki'));

  // Should have preserved the language class
  assert.ok(preElement.properties.class.includes('language-javascript'));

  // Should have added copy button
  const copyButton = preElement.children.find(
    child =>
      child.tagName === 'button' && child.properties.class === 'copy-button'
  );
  assert.ok(copyButton, 'Should have copy button');
});

test('rehypeShikiji - skips elements without language prefix', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: { className: ['no-language'] },
            children: [{ type: 'text', value: 'plain text' }],
          },
        ],
      },
    ],
  };

  const originalPre = tree.children[0];
  transformer(tree);

  // Should not modify the tree structure
  assert.equal(tree.children[0], originalPre);
  assert.equal(tree.children[0].tagName, 'pre');
});

test('rehypeShikiji - skips non-pre elements', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'div',
        children: [{ type: 'text', value: 'not a code block' }],
      },
    ],
  };

  const originalDiv = tree.children[0];
  transformer(tree);

  assert.equal(tree.children[0], originalDiv);
});

test('rehypeShikiji - handles empty pre element', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        children: [],
      },
    ],
  };

  // Should not throw
  assert.doesNotThrow(() => transformer(tree));
});

test('rehypeShikiji - handles pre without code child', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        children: [{ type: 'text', value: 'text without code tag' }],
      },
    ],
  };

  const originalPre = tree.children[0];
  transformer(tree);

  // Should not modify
  assert.equal(tree.children[0], originalPre);
});

test('rehypeShikiji - handles multiple code blocks', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: { className: ['language-javascript'] },
            children: [{ type: 'text', value: 'const x = 1;' }],
          },
        ],
      },
      {
        type: 'element',
        tagName: 'pre',
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: { className: ['language-python'] },
            children: [{ type: 'text', value: 'x = 1' }],
          },
        ],
      },
    ],
  };

  transformer(tree);

  // Both should be transformed
  assert.equal(tree.children.length, 2);
  assert.ok(tree.children[0].properties.class.includes('language-javascript'));
  assert.ok(tree.children[1].properties.class.includes('language-python'));
});

test('rehypeShikiji - creates switchable tabs for cjs/mjs pairs', () => {
  const transformer = rehypeShikiji();

  // Mock Shiki's codeToHast to return predictable structure
  const tree = {
    type: 'root',
    children: [
      createElement(
        'pre',
        { class: 'shiki language-cjs', style: 'color: #000' },
        [
          createElement('code', { class: 'language-cjs' }, [
            createElement('span', {}, 'const x = 1;'),
          ]),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
      createElement(
        'pre',
        { class: 'shiki language-mjs', style: 'color: #000' },
        [
          createElement('code', { class: 'language-mjs' }, [
            createElement('span', {}, 'const x = 1;'),
          ]),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
    ],
  };

  transformer(tree);

  // Should have merged into one switchable element
  assert.equal(tree.children.length, 1);

  const switchableElement = tree.children[0];
  assert.equal(switchableElement.tagName, 'pre');
  assert.ok(switchableElement.properties.class.includes('shiki'));

  // Should have checkbox
  const checkbox = switchableElement.children.find(
    child => child.tagName === 'input' && child.properties.type === 'checkbox'
  );
  assert.ok(checkbox, 'Should have checkbox');

  // Should have both code elements
  const codeElements = switchableElement.children.filter(
    child => child.tagName === 'code'
  );
  assert.equal(codeElements.length, 2, 'Should have two code elements');

  // Should have copy button
  const copyButton = switchableElement.children.find(
    child =>
      child.tagName === 'button' && child.properties.class === 'copy-button'
  );
  assert.ok(copyButton, 'Should have copy button');
});

test('rehypeShikiji - checkbox is checked when CJS is first', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      createElement(
        'pre',
        { class: 'shiki language-cjs', style: 'color: #000' },
        [
          createElement('code', { class: 'language-cjs' }, 'const x = 1;'),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
      createElement(
        'pre',
        { class: 'shiki language-mjs', style: 'color: #000' },
        [
          createElement('code', { class: 'language-mjs' }, 'const x = 1;'),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
    ],
  };

  transformer(tree);

  const checkbox = tree.children[0].children.find(
    child => child.tagName === 'input'
  );
  assert.equal(checkbox.properties.checked, true);
});

test('rehypeShikiji - checkbox is unchecked when MJS is first', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      createElement(
        'pre',
        { class: 'shiki language-mjs', style: 'color: #000' },
        [
          createElement('code', { class: 'language-mjs' }, 'const x = 1;'),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
      createElement(
        'pre',
        { class: 'shiki language-cjs', style: 'color: #000' },
        [
          createElement('code', { class: 'language-cjs' }, 'const x = 1;'),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
    ],
  };

  transformer(tree);

  const checkbox = tree.children[0].children.find(
    child => child.tagName === 'input'
  );
  assert.notEqual(checkbox.properties.checked, true);
});

test('rehypeShikiji - does not create tabs for single cjs block', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      createElement(
        'pre',
        { class: 'shiki language-cjs', style: 'color: #000' },
        [
          createElement('code', { class: 'language-cjs' }, 'const x = 1;'),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
    ],
  };

  const originalLength = tree.children.length;
  transformer(tree);

  // Should not create switchable element for single block
  assert.equal(tree.children.length, originalLength);
});

test('rehypeShikiji - preserves Shiki styling in switchable tabs', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      createElement(
        'pre',
        { class: 'shiki language-cjs', style: 'background-color: #fff' },
        [
          createElement('code', { class: 'language-cjs' }, 'const x = 1;'),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
      createElement(
        'pre',
        { class: 'shiki language-mjs', style: 'background-color: #fff' },
        [
          createElement('code', { class: 'language-mjs' }, 'const x = 1;'),
          createElement('button', { class: 'copy-button' }, 'copy'),
        ]
      ),
    ],
  };

  transformer(tree);

  // Style should be preserved from code blocks
  const switchableElement = tree.children[0];
  assert.ok(switchableElement.properties.style);
});

test('rehypeShikiji - handles code with no className', () => {
  const transformer = rehypeShikiji();

  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [{ type: 'text', value: 'plain code' }],
          },
        ],
      },
    ],
  };

  const originalPre = tree.children[0];
  transformer(tree);

  // Should not modify since no className
  assert.equal(tree.children[0], originalPre);
});
