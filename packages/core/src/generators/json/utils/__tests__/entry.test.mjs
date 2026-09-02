import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import { buildEntry, entryBody, takeTypedItems } from '../entry.mjs';

const code = value => u('inlineCode', value);
const text = value => u('text', value);
const type = value => u('typeAnnotation', { value });
const item = children => u('listItem', [u('paragraph', children)]);
const paragraph = value => u('paragraph', [text(value)]);

const typedList = (...items) => u('list', items);

describe('takeTypedItems', () => {
  const list = typedList(
    item([code('name'), text(' '), type('string')]),
    item([code('options'), text(' '), type('Object')]),
    item([text('A prose bullet that shares the list.')])
  );

  it('lifts the leading typed items out, leaving the rest as prose', () => {
    const { body, items } = takeTypedItems(
      [list, paragraph('After.')],
      'method'
    );

    assert.equal(items.length, 2);
    assert.deepEqual(body, [
      { ...list, children: [list.children[2]] },
      paragraph('After.'),
    ]);
  });

  it('removes a fully typed list from the body', () => {
    const fullyTyped = typedList(...list.children.slice(0, 2));

    const { body, items } = takeTypedItems(
      [paragraph('Before.'), fullyTyped],
      'event'
    );

    assert.equal(items.length, 2);
    assert.deepEqual(body, [paragraph('Before.')]);
  });

  it('leaves the list of a section alone', () => {
    const body = [list];

    assert.deepEqual(takeTypedItems(body, 'section'), { body, items: [] });
  });

  it('only lifts a class list that has an Extends item', () => {
    const body = [list];

    assert.deepEqual(takeTypedItems(body, 'class'), { body, items: [] });

    const extendsList = typedList(
      item([text('Extends: '), type('EventEmitter')])
    );

    assert.deepEqual(takeTypedItems([extendsList], 'class'), {
      body: [],
      items: extendsList.children,
    });
  });

  it('does nothing without a typed list', () => {
    const body = [paragraph('Only prose.')];

    assert.deepEqual(takeTypedItems(body, 'method'), { body, items: [] });
  });
});

describe('entryBody', () => {
  it('drops the heading and the stability index', () => {
    const heading = u('heading', { depth: 2 }, [text('Title')]);
    const stability = u(
      'blockquote',
      { data: { index: '1', description: 'Experimental' } },
      [paragraph('Stability: 1 - Experimental')]
    );
    const prose = paragraph('Body.');

    assert.deepEqual(
      entryBody({
        heading,
        stability,
        content: u('root', [heading, stability, prose]),
      }),
      [prose]
    );
  });

  it('keeps a stability blockquote the entry does not own', () => {
    const heading = u('heading', { depth: 2 }, [text('Title')]);
    const example = u(
      'blockquote',
      { data: { index: '2', description: 'Stable' } },
      [paragraph('Stability: 2 - Stable')]
    );

    assert.deepEqual(
      entryBody({ heading, content: u('root', [heading, example]) }),
      [example]
    );
  });
});

describe('buildEntry', () => {
  it('normalises the metadata and renders the body', () => {
    const heading = u('heading', { depth: 2, data: { text: '`foo()`' } }, [
      code('foo()'),
    ]);
    const body = [
      paragraph('Does a thing.'),
      u('code', { lang: 'js', meta: 'displayName="Usage"' }, 'foo();'),
    ];

    const entry = buildEntry(
      {
        heading,
        content: u('root', [heading, ...body]),
        added: 'v1.0.0',
        napiVersion: 3,
        changes: [{ version: ['v2.0.0', 'v1.5.0'], description: 'Changed.' }],
      },
      body
    );

    assert.deepEqual(entry, {
      title: '`foo()`',
      stability: null,
      added: ['v1.0.0'],
      deprecated: [],
      removed: [],
      napiVersion: [3],
      changes: [
        {
          versions: ['v2.0.0', 'v1.5.0'],
          prUrl: null,
          commit: null,
          description: 'Changed.',
        },
      ],
      description: 'Does a thing.\n\n```js displayName="Usage"\nfoo();\n```',
      summary: 'Does a thing.',
      examples: [{ language: 'js', displayName: 'Usage', code: 'foo();' }],
    });
  });

  it('prefers the llm_description as the summary', () => {
    const heading = u('heading', { depth: 2, data: { text: 'Foo' } }, [
      text('Foo'),
    ]);
    const body = [paragraph('The first paragraph.')];

    const { summary } = buildEntry(
      {
        heading,
        content: u('root', [heading, ...body]),
        llm_description: 'For machines.',
      },
      body
    );

    assert.equal(summary, 'For machines.');
  });
});
