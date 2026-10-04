import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import {
  blocksToMarkdown,
  extractExamples,
  inlineToMarkdown,
} from '../markdown.mjs';

describe('blocksToMarkdown', () => {
  it('serialises blocks, type annotations included', () => {
    const nodes = [
      u('paragraph', [
        u('text', 'Returns a '),
        u('typeAnnotation', { value: 'Promise<string>' }),
        u('text', '.'),
      ]),
      u('code', { lang: 'js' }, 'foo();'),
    ];

    assert.equal(
      blocksToMarkdown(nodes),
      'Returns a {Promise<string>}.\n\n```js\nfoo();\n```'
    );
  });

  it('is empty without nodes', () => {
    assert.equal(blocksToMarkdown([]), '');
    assert.equal(inlineToMarkdown([]), '');
  });
});

describe('inlineToMarkdown', () => {
  it('serialises phrasing content', () => {
    assert.equal(
      inlineToMarkdown([
        u('text', 'See '),
        u('link', { url: '#foo' }, [u('inlineCode', 'foo()')]),
        u('text', '.'),
      ]),
      'See [`foo()`](#foo).'
    );
  });
});

describe('extractExamples', () => {
  it('collects fenced code blocks in order, with their info string', () => {
    const nodes = [
      u('paragraph', [u('text', 'Text')]),
      u('code', { lang: 'mjs', meta: 'displayName="ESM"' }, 'import x;'),
      u('blockquote', [u('code', { lang: null, meta: null }, 'plain')]),
    ];

    assert.deepEqual(extractExamples(nodes), [
      { language: 'mjs', displayName: 'ESM', code: 'import x;' },
      { language: null, displayName: null, code: 'plain' },
    ]);
  });
});
