'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import { parseTypeList } from '../parseTypeList.mjs';

test('`bla {[integer](https://mdn-link)} Description start bla bla bla [asd](https://random-link)', () => {
  /**
   * @type {Array<import('mdast').PhrasingContent>}
   */
  const nodes = [
    {
      type: 'text',
      value: 'this should be ignored',
    },
    {
      type: 'link',
      url: 'https://mdn-link',
      children: [{ type: 'text', value: '<integer>' }],
    },
    {
      type: 'text',
      value: ' Description start bla bla bla',
    },
    {
      type: 'link',
      url: 'https://node-link',
      children: [{ type: 'text', value: 'ignored since in description' }],
    },
  ];

  const result = parseTypeList(nodes, 1);
  assert.deepStrictEqual(result.types, ['integer']);
  assert.equal(result.endingIndex, 1);
});

test('`bla {[integer](https://mdn-link) | [string](https://mdn-link)} Description start bla bla bla [asd](https://random-link)', () => {
  /**
   * @type {Array<import('mdast').PhrasingContent>}
   */
  const nodes = [
    {
      type: 'text',
      value: 'this should be ignored',
    },
    {
      type: 'link',
      url: 'https://mdn-link',
      children: [{ type: 'text', value: '<integer>' }],
    },
    {
      type: 'text',
      value: ' | ',
    },
    {
      type: 'link',
      url: 'https://mdn-link',
      children: [{ type: 'text', value: '<string>' }],
    },
    {
      type: 'text',
      value: ' Description start bla bla bla',
    },
    {
      type: 'link',
      url: 'https://random-link',
      children: [{ type: 'text', value: 'asd' }],
    },
  ];

  const result = parseTypeList(nodes, 1);
  assert.deepStrictEqual(result.types, ['integer', 'string']);
  assert.equal(result.endingIndex, 3);
});
