import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toHtml } from 'hast-util-to-html';

import {
  typeAnnotationToHast,
  typeAnnotationToHighlightedHast,
} from '../hast.mjs';

// A minimal mdast-util-to-hast state — the handlers only use patch/applyData
const state = { patch: () => {}, applyData: (_, result) => result };

const makeNode = (value, data) => ({ type: 'typeAnnotation', value, data });

describe('typeAnnotationToHast', () => {
  it('renders one <code> with anchors over link ranges', () => {
    const node = makeNode('Buffer|string', {
      links: [
        { start: 0, end: 6, text: 'Buffer', href: 'buffer.html#class-buffer' },
        { start: 7, end: 13, text: 'string', href: 'mdn.io/string' },
      ],
    });

    assert.equal(
      toHtml(typeAnnotationToHast(state, node)),
      '<code class="type">' +
        '<a href="buffer.html#class-buffer" class="type-link">Buffer</a>' +
        '|' +
        '<a href="mdn.io/string" class="type-link">string</a>' +
        '</code>'
    );
  });

  it('renders unresolved types as plain code', () => {
    const node = makeNode('SomethingUnknown', { links: [] });

    assert.equal(
      toHtml(typeAnnotationToHast(state, node)),
      '<code class="type">SomethingUnknown</code>'
    );
  });

  it('renders parse errors as plain code', () => {
    const node = makeNode('not a type!', { links: [], parseError: true });

    assert.equal(
      toHtml(typeAnnotationToHast(state, node)),
      '<code class="type">not a type!</code>'
    );
  });

  it('handles missing data', () => {
    const node = makeNode('string');

    assert.equal(
      toHtml(typeAnnotationToHast(state, node)),
      '<code class="type">string</code>'
    );
  });
});

describe('typeAnnotationToHighlightedHast', () => {
  it('produces one inline <code> with shiki tokens and embedded links', () => {
    const node = makeNode('Promise<string>', {
      links: [{ start: 0, end: 7, text: 'Promise', href: 'mdn.io/promise' }],
    });

    const element = typeAnnotationToHighlightedHast(state, node);

    assert.equal(element.tagName, 'code');
    assert.ok(element.properties.class.includes('type'));
    assert.ok(element.properties.class.includes('shiki'));

    const html = toHtml(element);

    // The resolved identifier is an anchor inside the highlighted fragment
    assert.match(html, /<a href="mdn.io\/promise"[^>]*>(<[^>]+>)*Promise/);
    // The rest of the type is present as highlighted tokens
    assert.match(html, /string/);
    // No block <pre> wrapper survives
    assert.doesNotMatch(html, /<pre/);
  });

  it('splits a link range that crosses token boundaries', () => {
    const node = makeNode('vm.Module', {
      links: [
        { start: 0, end: 9, text: 'vm.Module', href: 'vm.html#class-module' },
      ],
    });

    const html = toHtml(typeAnnotationToHighlightedHast(state, node));

    // Shiki tokenizes `vm`, `.`, `Module` separately; the whole range links
    const anchors = html.match(/href="vm.html#class-module"/g);
    assert.ok(anchors.length >= 1);
    assert.match(html.replace(/<[^>]+>/g, ''), /^vm\.Module$/);
  });

  it('falls back to plain code when nothing resolved', () => {
    const node = makeNode('Whatever', { links: [] });

    assert.equal(
      toHtml(typeAnnotationToHighlightedHast(state, node)),
      '<code class="type">Whatever</code>'
    );
  });

  it('falls back to plain code on parse errors', () => {
    const node = makeNode(') weird (', { links: [], parseError: true });

    assert.equal(
      toHtml(typeAnnotationToHighlightedHast(state, node)),
      '<code class="type">) weird (</code>'
    );
  });
});
