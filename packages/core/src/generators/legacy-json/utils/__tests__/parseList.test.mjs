import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractPattern, parseListItem, parseList } from '../parseList.mjs';

const validTypedList = [
  { type: 'inlineCode', value: 'option' }, // inline code
  { type: 'text', value: ' ' }, // space
  { type: 'typeAnnotation', value: 'boolean' },
  { type: 'text', value: ' option description' },
];

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
          children: [
            { type: 'inlineCode', value: 'param' },
            { type: 'text', value: ' ' },
            { type: 'typeAnnotation', value: 'string' },
            { type: 'text', value: ' description' },
          ],
        },
      ],
    };

    const result = parseListItem(child);
    assert.equal(result.textRaw, '`param` {string} description');
    assert.equal(result.name, 'param');
    assert.equal(result.type, 'string');
    assert.equal(result.desc, 'description');
  });

  it('keeps union types verbatim', () => {
    const child = {
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'inlineCode', value: 'data' },
            { type: 'text', value: ' ' },
            { type: 'typeAnnotation', value: 'Buffer | string' },
            { type: 'text', value: ' the data' },
          ],
        },
      ],
    };

    const result = parseListItem(child);
    assert.equal(result.textRaw, '`data` {Buffer | string} the data');
    assert.equal(result.type, 'Buffer | string');
  });

  it('handles nested braces in types', () => {
    const child = {
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'inlineCode', value: 'maps' },
            { type: 'text', value: ' ' },
            { type: 'typeAnnotation', value: 'Record<string, {a: number}>' },
            { type: 'text', value: ' the maps' },
          ],
        },
      ],
    };

    const result = parseListItem(child);
    assert.equal(result.type, 'Record<string, {a: number}>');
    assert.equal(result.desc, 'the maps');
  });

  it('does not mistake a prose annotation for the type', () => {
    const child = {
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'inlineCode', value: 'param' },
            { type: 'text', value: ' see also ' },
            { type: 'typeAnnotation', value: 'string' },
            { type: 'text', value: ' values' },
          ],
        },
      ],
    };

    const result = parseListItem(child);
    assert.equal(result.type, undefined);
    assert.equal(result.desc, 'see also {string} values');
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

  it('extracts the default value', () => {
    const child = {
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'inlineCode', value: 'flag' },
            { type: 'text', value: ' ' },
            { type: 'typeAnnotation', value: 'boolean' },
            { type: 'text', value: ' turns it on. ' },
            { type: 'strong', children: [{ type: 'text', value: 'Default:' }] },
            { type: 'text', value: ' ' },
            { type: 'inlineCode', value: 'false' },
          ],
        },
      ],
    };

    const result = parseListItem(child);
    assert.equal(result.type, 'boolean');
    assert.equal(result.default, '`false`');
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
    assert.equal(section.type, 'boolean');
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
