import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSyntheticHead, wrapAsEntry } from '../synthetic.mjs';

describe('createSyntheticHead', () => {
  it('derives api, path, and basename from the api slug', () => {
    const head = createSyntheticHead('all', 'All');

    assert.equal(head.api, 'all');
    assert.equal(head.path, '/all');
    assert.equal(head.basename, 'all');
  });

  it('produces a depth-1 heading whose data is consistent with the name', () => {
    const head = createSyntheticHead('index', 'Index');

    assert.equal(head.heading.type, 'heading');
    assert.equal(head.heading.depth, 1);
    assert.equal(head.heading.children[0].value, 'Index');
    assert.deepEqual(head.heading.data, {
      name: 'Index',
      text: 'Index',
      slug: 'index',
    });
  });

  it('does not assign a heading type so no DataTag icon is rendered', () => {
    const { heading } = createSyntheticHead('404', 'Page Not Found');

    assert.equal(heading.data.type, undefined);
  });
});

describe('wrapAsEntry', () => {
  it('places the head heading at the start of the content tree', () => {
    const head = createSyntheticHead('foo', 'Foo');
    const paragraph = { type: 'paragraph', children: [] };

    const entry = wrapAsEntry(head, [paragraph]);

    assert.equal(entry.content.type, 'root');
    assert.equal(entry.content.children[0], head.heading);
    assert.equal(entry.content.children[1], paragraph);
  });

  it('marks the entry as stability-less so the metabar is not annotated', () => {
    const entry = wrapAsEntry(createSyntheticHead('foo', 'Foo'), []);

    assert.equal(entry.stability, null);
  });

  it('forwards the api/path/basename from the head', () => {
    const head = createSyntheticHead('foo', 'Foo');

    const entry = wrapAsEntry(head, []);

    assert.equal(entry.api, head.api);
    assert.equal(entry.path, head.path);
    assert.equal(entry.basename, head.basename);
  });
});
