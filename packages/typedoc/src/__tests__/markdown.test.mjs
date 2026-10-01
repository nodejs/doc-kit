import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  code,
  firstSentence,
  splitFirstParagraph,
} from '../utils/markdown.mjs';

describe('code', () => {
  it('wraps text in a code span', () => {
    assert.equal(code('a.b'), '`a.b`');
  });

  it('uses longer delimiters around backticks', () => {
    assert.equal(code('a`b'), '`` a`b ``');
  });
});

describe('splitFirstParagraph', () => {
  it('splits the first paragraph from the rest', () => {
    assert.deepEqual(splitFirstParagraph('One.\n\nTwo.'), ['One.', 'Two.']);
  });

  it('keeps Markdown opening with a list whole', () => {
    assert.deepEqual(splitFirstParagraph('- a\n\n- b'), ['- a\n\n- b', '']);
  });

  it('has no first paragraph before a code block', () => {
    assert.deepEqual(splitFirstParagraph('```js\na\n```'), [
      '',
      '```js\na\n```',
    ]);
  });
});

describe('firstSentence', () => {
  it('takes the first sentence of the first paragraph, on one line', () => {
    assert.equal(
      firstSentence('Builds\nonce. Then stops.\n\nMore.'),
      'Builds once.'
    );
  });

  it('takes a paragraph without a sentence end whole', () => {
    assert.equal(firstSentence('The entry'), 'The entry');
  });
});
