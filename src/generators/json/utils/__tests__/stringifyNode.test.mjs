import assert from 'node:assert';
import test from 'node:test';

import { stringifyNode } from '../stringifyNode.mjs';

test('break', () => {
  /**
   * @type {import('mdast').PhrasingContent}
   */
  const node = {
    type: 'break',
  };

  assert.strictEqual(stringifyNode(node), '\n');
});

test('delete', () => {
  /**
   * @type {import('mdast').PhrasingContent}
   */
  const node = {
    type: 'delete',
    children: [
      {
        type: 'text',
        value: 'hello world',
      },
    ],
  };

  assert.strictEqual(stringifyNode(node), '~~hello world~~');
});

test('emphasis', () => {
  /**
   * @type {import('mdast').PhrasingContent}
   */
  const node = {
    type: 'emphasis',
    children: [
      {
        type: 'text',
        value: 'hello world',
      },
    ],
  };

  assert.strictEqual(stringifyNode(node), '*hello world*');
});

test('html', () => {
  /**
   * @type {import('mdast').PhrasingContent}
   */
  const node = {
    type: 'html',
    value: '<string>',
  };

  assert.strictEqual(stringifyNode(node), node.value);
});

test('inlineCode', () => {
  /**
   * @type {import('mdast').PhrasingContent}
   */
  const node = {
    type: 'inlineCode',
    value: `hello world`,
  };

  assert.strictEqual(stringifyNode(node), '`hello world`');
});

test('link', () => {
  {
    /**
     * @type {import('mdast').PhrasingContent}
     */
    const node = {
      type: 'link',
      title: 'hello',
      url: 'https://nodejs.org',
    };

    assert.strictEqual(stringifyNode(node), '[hello](https://nodejs.org)');
  }

  {
    /**
     * @type {import('mdast').PhrasingContent}
     */
    const node = {
      type: 'link',
      url: 'https://nodejs.org',
      children: [
        {
          type: 'text',
          value: 'hello',
        },
      ],
    };

    assert.strictEqual(stringifyNode(node), '[hello](https://nodejs.org)');
  }
});

test('strong', () => {
  /**
   * @type {import('mdast').PhrasingContent}
   */
  const node = {
    type: 'strong',
    children: [
      {
        type: 'text',
        value: 'hello world',
      },
    ],
  };

  assert.strictEqual(stringifyNode(node), '**hello world**');
});

test('text', () => {
  /**
   * @type {import('mdast').PhrasingContent}
   */
  const node = {
    type: 'text',
    value: 'hello world',
  };

  assert.strictEqual(stringifyNode(node), 'hello world');
});
