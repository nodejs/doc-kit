import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  transformTypeReferences,
  extractPattern,
  parseListItem,
  parseTypedList,
} from '../list.mjs';

const validTypedList = [
  { type: 'inlineCode', value: 'option' },
  { type: 'text', value: ' ' },
  {
    type: 'link',
    children: [{ type: 'text', value: '<boolean>' }],
  },
  { type: 'text', value: ' option description' },
];

describe('transformTypeReferences', () => {
  it('replaces template syntax with curly braces', () => {
    const result = transformTypeReferences('`<string>`');
    assert.equal(result, '{string}');
  });

  it('normalizes multiple types', () => {
    const result = transformTypeReferences('`<string>` | `<number>`');
    assert.equal(result, '{string|number}');
  });

  it('leaves unrelated text untouched', () => {
    assert.equal(transformTypeReferences('no refs here'), 'no refs here');
  });
});

describe('extractPattern', () => {
  it('extracts pattern and removes from text', () => {
    const current = {};
    const result = extractPattern(
      'name: test description',
      /name:\s*([^.\s]+)/,
      'name',
      current
    );

    assert.equal(current.name, 'test');
    assert.equal(result, ' description');
  });

  it('returns original text when pattern not found', () => {
    const current = {};
    const result = extractPattern(
      'no match',
      /missing:\s*([^.]+)/,
      'missing',
      current
    );

    assert.equal(result, 'no match');
    assert.equal(current.missing, undefined);
  });

  it('strips a trailing period from the captured value', () => {
    const current = {};
    extractPattern('name: value.', /name:\s*(\S+)/, 'name', current);
    assert.equal(current.name, 'value');
  });
});

describe('parseListItem', () => {
  it('parses basic list item', () => {
    const child = {
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'param {string} description' }],
        },
      ],
    };

    const result = parseListItem(child);
    assert.equal(typeof result, 'object');
    assert.ok(result.textRaw);
  });

  it('identifies return items', () => {
    const child = {
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Returns: something' }],
        },
      ],
    };

    const result = parseListItem(child);
    assert.equal(result.name, 'return');
  });
});

describe('parseTypedList', () => {
  it('processes property sections', () => {
    const section = { type: 'property', name: 'test' };
    const nodes = [
      {
        type: 'list',
        children: [
          {
            children: [
              {
                type: 'paragraph',
                children: validTypedList,
              },
            ],
          },
        ],
      },
    ];

    parseTypedList(section, nodes);
    assert.ok(section.textRaw);
  });

  it('processes event sections', () => {
    const section = { type: 'event' };
    const nodes = [
      {
        type: 'list',
        children: [
          {
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'param description' }],
              },
            ],
          },
        ],
      },
    ];

    parseTypedList(section, nodes);
    assert.ok(Array.isArray(section.params));
  });

  it('processes recursive lists', () => {
    const section = { type: 'event' };
    const nodes = [
      {
        type: 'list',
        children: [
          {
            children: [
              {
                type: 'paragraph',
                children: validTypedList,
              },
              {
                type: 'list',
                children: [
                  {
                    children: [
                      {
                        type: 'paragraph',
                        children: validTypedList,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    parseTypedList(section, nodes);
    assert.equal(section.params[0].options.length, 1);
  });

  it('leaves unknown section types unchanged and keeps the list in place', () => {
    const section = { type: 'unknown' };
    const nodes = [
      {
        type: 'list',
        children: [
          {
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'ignored' }],
              },
            ],
          },
        ],
      },
    ];

    parseTypedList(section, nodes);
    assert.equal(nodes.length, 1, 'list should not be spliced out');
    assert.deepStrictEqual(section, { type: 'unknown' });
  });
});
