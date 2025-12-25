import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  transformTypeReferences,
  extractPattern,
  parseListItem,
  parseList,
} from '../parseList.mjs';

const validTypedList = [
  { type: 'inlineCode', value: 'option' }, // inline code
  { type: 'text', value: ' ' }, // space
  {
    type: 'link',
    children: [{ type: 'text', value: '<boolean>' }], // link with < value
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

describe('parseList', () => {
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

    parseList(section, nodes);
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

    parseList(section, nodes);
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
              // This is a nested typed list
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

    parseList(section, nodes);
    assert.equal(section.params[0].options.length, 1);
  });
});
