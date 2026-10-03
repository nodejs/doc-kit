import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { code, firstSentence, toMarkdown } from '../markdown.mjs';

describe('code', () => {
  it('wraps text in a code span', () => {
    assert.equal(code('a.b'), '`a.b`');
  });

  it('uses longer delimiters around backticks', () => {
    assert.equal(code('a`b'), '`` a`b ``');
  });
});

describe('firstSentence', () => {
  it('takes the first sentence, on one line', () => {
    assert.equal(firstSentence('Builds\nonce. Then stops.'), 'Builds once.');
  });

  it('takes a paragraph without a sentence end whole', () => {
    assert.equal(firstSentence('The entry'), 'The entry');
  });
});

describe('toMarkdown', () => {
  it('collapses blank lines and ends with one newline', () => {
    assert.equal(toMarkdown(['# A', '', '', '', 'b', '', '']), '# A\n\nb\n');
  });
});
