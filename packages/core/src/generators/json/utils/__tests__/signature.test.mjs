import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import {
  buildEventParameters,
  buildExtends,
  buildPropertyType,
  buildSignature,
} from '../signature.mjs';

const code = value => u('inlineCode', value);
const text = value => u('text', value);
const type = (value, links = []) =>
  u('typeAnnotation', { value, data: { links } });
const strong = value => u('strong', [text(value)]);
const item = (children, ...blocks) =>
  u('listItem', [u('paragraph', children), ...blocks]);
const heading = (textValue, name = textValue, type) => ({
  depth: 3,
  data: { text: textValue, name, type },
});

describe('buildSignature', () => {
  it('describes the parameters the heading declares with the list', () => {
    const items = [
      item([code('path'), text(' '), type('string | URL'), text(' The file.')]),
      item(
        [code('options'), text(' '), type('Object')],
        u('list', [
          item([
            code('encoding'),
            text(' '),
            type('string'),
            text(' The encoding. '),
            strong('Default:'),
            text(' '),
            code("'utf8'"),
            text('.'),
          ]),
        ])
      ),
      item([
        text('Returns: '),
        type('Promise'),
        text(' Fulfills with the file.'),
      ]),
    ];

    const signature = buildSignature(
      heading('`fs.readFile(path[, options], callback)`'),
      items
    );

    assert.deepEqual(
      signature.parameters.map(({ name, optional, rest }) => [
        name,
        optional,
        rest,
      ]),
      [
        ['path', false, false],
        ['options', true, false],
        ['callback', false, false],
      ]
    );

    const [path, options, callback] = signature.parameters;

    assert.deepEqual(path.type, { text: 'string | URL', links: [] });
    assert.equal(path.description, 'The file.');
    assert.equal(path.default, null);

    assert.deepEqual(options.properties, [
      {
        name: 'encoding',
        type: { text: 'string', links: [] },
        description: 'The encoding.',
        default: "'utf8'",
        optional: true,
        rest: false,
        properties: [],
      },
    ]);

    // Declared in the heading, absent from the list
    assert.deepEqual(callback, {
      name: 'callback',
      type: null,
      description: '',
      default: null,
      optional: false,
      rest: false,
      properties: [],
    });

    assert.deepEqual(signature.returns, {
      type: { text: 'Promise', links: [] },
      description: 'Fulfills with the file.',
    });
  });

  it('carries the type links through', () => {
    const links = [
      { text: 'Buffer', href: 'buffer.html#class-buffer', start: 0, end: 6 },
    ];
    const items = [item([code('buf'), text(' '), type('Buffer', links)])];

    const { parameters } = buildSignature(heading('`fill(buf)`'), items);

    assert.deepEqual(parameters[0].type.links, [
      { name: 'Buffer', href: 'buffer.html#class-buffer', start: 0, end: 6 },
    ]);
  });

  it('marks rest parameters', () => {
    const items = [item([code('...paths'), text(' '), type('string')])];

    const { parameters } = buildSignature(
      heading('`path.join([...paths])`'),
      items
    );

    assert.deepEqual(parameters, [
      {
        name: 'paths',
        type: { text: 'string', links: [] },
        description: '',
        default: null,
        optional: true,
        rest: true,
        properties: [],
      },
    ]);
  });

  it('has no parameters and no return value without a list or parentheses', () => {
    assert.deepEqual(buildSignature(heading('`emitter.close()`'), []), {
      parameters: [],
      returns: null,
    });
  });
});

describe('buildExtends', () => {
  it('takes the Extends item', () => {
    const items = [item([text('Extends: '), type('EventEmitter')])];

    assert.deepEqual(
      buildExtends(heading('Class: `net.Server`', 'net.Server'), items),
      {
        text: 'EventEmitter',
        links: [],
      }
    );
  });

  it("falls back to the heading's extends clause", () => {
    assert.deepEqual(
      buildExtends(heading('Class: `Foo extends Bar`', 'Foo extends Bar'), []),
      { text: 'Bar', links: [] }
    );
  });

  it('is null without either', () => {
    assert.equal(buildExtends(heading('Class: `Foo`', 'Foo'), []), null);
  });
});

describe('buildPropertyType', () => {
  it('takes the type, default and description of the first item', () => {
    const items = [
      item([
        text('Type: '),
        type('number'),
        text(' The size. '),
        strong('Default:'),
        text(' '),
        code('1'),
      ]),
    ];

    assert.deepEqual(buildPropertyType(items), {
      type: { text: 'number', links: [] },
      default: '1',
      description: 'The size.',
    });
  });

  it('is empty without items', () => {
    assert.deepEqual(buildPropertyType([]), {
      type: null,
      default: null,
      description: '',
    });
  });
});

describe('buildEventParameters', () => {
  it('describes every item', () => {
    const items = [
      item([code('code'), text(' '), type('number'), text(' The exit code.')]),
      item([code('signal'), text(' '), type('string | null')]),
    ];

    assert.deepEqual(
      buildEventParameters(items).map(({ name, type, description }) => [
        name,
        type.text,
        description,
      ]),
      [
        ['code', 'number', 'The exit code.'],
        ['signal', 'string | null', ''],
      ]
    );
  });
});
