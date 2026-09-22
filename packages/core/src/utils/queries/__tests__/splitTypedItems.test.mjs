import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import { splitTypedItems } from '../index.mjs';

const item = children => u('listItem', [u('paragraph', children)]);
const typed = item([
  u('inlineCode', 'name'),
  u('text', ' '),
  u('typeAnnotation', { value: 'string' }),
]);
const prose = item([u('text', 'A prose bullet.')]);

describe('splitTypedItems', () => {
  it('separates the leading typed items from the rest', () => {
    assert.deepEqual(splitTypedItems(u('list', [typed, typed, prose, typed])), {
      typed: [typed, typed],
      rest: [prose, typed],
    });
  });

  it('has no rest when every item is typed', () => {
    assert.deepEqual(splitTypedItems(u('list', [typed])), {
      typed: [typed],
      rest: [],
    });
  });
});
