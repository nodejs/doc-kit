import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildNotFoundPage } from '../404.mjs';

describe('buildNotFoundPage', () => {
  it('uses a `404` head with a "Page Not Found" heading', () => {
    const { head } = buildNotFoundPage();

    assert.equal(head.api, '404');
    assert.equal(head.path, '/404');
    assert.equal(head.basename, '404');
    assert.equal(head.heading.data.name, 'Page Not Found');
  });

  it('produces a single synthetic entry with a not-found paragraph', () => {
    const { entries } = buildNotFoundPage();

    assert.equal(entries.length, 1);

    const paragraph = entries[0].content.children.find(
      child => child.type === 'paragraph'
    );

    assert.ok(paragraph, 'expected a paragraph node in the content tree');
    assert.match(paragraph.children[0].value, /could not be found/);

    const link = paragraph.children.find(child => child.type === 'link');

    assert.equal(link.url, 'index.html');
    assert.equal(link.children[0].value, 'API index');
  });

  it('places the head heading at the start of the content tree', () => {
    const { head, entries } = buildNotFoundPage();

    assert.equal(entries[0].content.children[0], head.heading);
  });

  it('returns the same shape on every call', () => {
    const a = buildNotFoundPage();
    const b = buildNotFoundPage();

    assert.deepEqual(a.head, b.head);
    assert.equal(a.entries.length, b.entries.length);
  });
});
