import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const highlightToHast = mock.fn((code, lang) => ({
  type: 'element',
  tagName: 'pre',
  properties: { lang },
  children: [{ type: 'text', value: code }],
}));

mock.module('../../../../utils/highlighter.mjs', {
  namedExports: {
    highlighter: { highlightToHast },
  },
});

mock.module('../../../../utils/queries/index.mjs', {
  defaultExport: {
    UNIST: {
      isTypedList: node => node.type === 'list',
    },
  },
});

mock.module('../../../legacy-json/utils/parseList.mjs', {
  namedExports: {
    parseListItem: item => item,
  },
});

const parseSignature = mock.fn((text, params) => {
  if (text.includes('extends')) {
    return { params, return: null, extends: { type: 'Base' } };
  }

  return {
    params,
    return: { type: 'number' },
    extends: null,
  };
});

mock.module('../../../legacy-json/utils/parseSignature.mjs', {
  defaultExport: parseSignature,
});

const buildSignature = (await import('../buildSignature.mjs')).default;
const { generateSignature, getFullName } =
  await import('../buildSignature.mjs');

describe('jsx-ast/utils/buildSignature', () => {
  it('generateSignature formats class extends signature', () => {
    const sig = generateSignature('Foo', {
      params: [],
      return: null,
      extends: { type: 'Bar' },
    });
    assert.equal(sig, 'class Foo extends Bar');
  });

  it('generateSignature formats params/return and marks optional params', () => {
    const sig = generateSignature(
      'fn',
      {
        params: [
          { name: 'a', optional: true },
          { name: 'b', default: '1' },
          { name: 'c' },
        ],
        return: { type: 'string' },
        extends: null,
      },
      ''
    );

    assert.equal(sig, 'fn(a?, b?, c): string');
  });

  it('getFullName prefers inline code containing the name', () => {
    assert.equal(
      getFullName({ name: 'bar', text: 'Use `foo.bar()` here' }),
      'foo.bar'
    );
    assert.equal(getFullName({ name: 'foo', text: 'foo' }), 'foo');
  });

  it('does not insert signature for class with no extends', () => {
    const heading = {
      type: 'heading',
      data: { type: 'class', name: 'Foo', text: 'class Foo' },
    };
    const list = { type: 'list', children: [] };

    const parent = { children: [heading, list] };

    buildSignature(parent, heading, 0);

    assert.deepEqual(parent.children, [heading, list]);
  });

  it('inserts signature and removes extends list for classes with extends', () => {
    const heading = {
      type: 'heading',
      data: { type: 'class', name: 'Foo', text: 'class Foo extends Base' },
    };
    const list = { type: 'list', children: [{ name: 'x' }] };

    const parent = { children: [heading, list, { type: 'paragraph' }] };

    buildSignature(parent, heading, 0);

    // First node should be inserted signature wrapper
    assert.equal(parent.children[0].type, 'element');
    assert.equal(parent.children[0].tagName, 'div');

    // Typed list removed
    assert.equal(
      parent.children.some(n => n === list),
      false
    );

    assert.equal(highlightToHast.mock.callCount(), 1);
  });

  it('prefixes constructors with "new "', () => {
    const heading = {
      type: 'heading',
      data: { type: 'ctor', name: 'Foo', text: 'new Foo()' },
    };
    const parent = { children: [heading] };

    buildSignature(parent, heading, 0);

    const code = parent.children[0].children[0].children[0].value;
    assert.match(code, /^new\s+/);
  });
});
