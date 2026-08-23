import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseInline, renderAsHTML } from '../inline.mjs';

describe('parseInline', () => {
  it('drops the paragraph a line of prose is parsed into', () => {
    const nodes = parseInline('Some `code` here.');

    assert.deepEqual(
      nodes.map(node => node.type),
      ['text', 'inlineCode', 'text']
    );
  });

  it('replaces links with their text when asked', () => {
    const markdown = 'Superseded by [DEP0111](#DEP0111).';

    assert.equal(parseInline(markdown)[1].type, 'link');
    assert.deepEqual(
      parseInline(markdown, true).map(node => node.type),
      ['text', 'text', 'text']
    );
  });
});

describe('renderAsHTML', () => {
  it('renders nodes without whitespace between them', () => {
    const html = renderAsHTML(parseInline('Now returns `undefined`.'));

    assert.equal(html, 'Now returns <code>undefined</code>.');
  });

  it('drops raw HTML rather than passing it through', () => {
    const html = renderAsHTML(parseInline('A <b>bold</b> claim.'));

    assert.equal(html, 'A bold claim.');
  });
});
