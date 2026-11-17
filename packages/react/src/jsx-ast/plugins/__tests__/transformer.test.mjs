import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import transformer from '../transformer.mjs';

const text = value => ({ type: 'text', value });

const element = (tagName, children) => ({
  type: 'element',
  tagName,
  properties: {},
  children,
});

const cell = (tagName, value) => element(tagName, [text(value)]);

/**
 * Builds a row whose cells are surrounded by whitespace text nodes, as
 * `rehype-raw` leaves them.
 */
const spacedRow = (tagName, values) =>
  element('tr', [
    text('\n'),
    ...values.flatMap(value => [cell(tagName, value), text('\n')]),
  ]);

/**
 * Builds a table whose rows and cells are surrounded by whitespace text nodes.
 */
const spacedTable = () =>
  element('table', [
    text('\n'),
    element('thead', [
      text('\n'),
      spacedRow('th', ['Name', 'Value']),
      text('\n'),
    ]),
    text('\n'),
    element('tbody', [
      text('\n'),
      spacedRow('td', ['a', '1']),
      text('\n'),
      spacedRow('td', ['b', '2']),
      text('\n'),
    ]),
    text('\n'),
  ]);

describe('jsx-ast transformer', () => {
  it('labels cells when whitespace surrounds the header row', () => {
    const tree = { type: 'root', children: [spacedTable()] };

    transformer()(tree);

    const [container] = tree.children;
    const table = container.children[0];
    const tbody = table.children.find(el => el.tagName === 'tbody');
    const labels = tbody.children
      .filter(el => el.tagName === 'tr')
      .flatMap(tr => tr.children.filter(el => el.tagName === 'td'))
      .map(td => td.properties['data-label']);

    assert.equal(container.tagName, 'div');
    assert.deepEqual(container.properties.className, ['overflow-container']);
    assert.deepEqual(labels, ['Name', 'Value', 'Name', 'Value']);
  });

  it('does not throw when the header has no row', () => {
    const tree = {
      type: 'root',
      children: [
        element('table', [
          element('thead', []),
          element('tbody', [spacedRow('td', ['a'])]),
        ]),
      ],
    };

    assert.doesNotThrow(() => transformer()(tree));
  });

  it('does not throw when a table with a header has no body', () => {
    const tree = {
      type: 'root',
      children: [
        element('table', [
          text('\n'),
          element('thead', [spacedRow('th', ['a'])]),
          text('\n'),
        ]),
      ],
    };

    assert.doesNotThrow(() => transformer()(tree));
  });

  it('moves generated footnotes into the page content fragment', () => {
    const content = {
      type: 'mdxJsxFlowElement',
      name: null,
      children: [{ type: 'element', tagName: 'p', children: [] }],
    };
    const footnotes = {
      type: 'element',
      tagName: 'section',
      properties: { dataFootnotes: '', className: ['footnotes'] },
      children: [
        {
          type: 'element',
          tagName: 'ol',
          children: [
            {
              type: 'element',
              tagName: 'li',
              properties: { id: 'user-content-fn-a' },
              children: [{ type: 'text', value: 'Footnote text' }],
            },
          ],
        },
      ],
    };
    const tree = {
      type: 'root',
      children: [content, { type: 'text', value: '\n' }, footnotes],
    };

    transformer()(tree);

    assert.equal(tree.children.includes(footnotes), false);
    assert.equal(content.children.at(-1), footnotes);
  });
});
