import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const warn = mock.fn();

mock.module('../../../../logger/index.mjs', {
  defaultExport: { warn },
});

const { createTypeResolver } = await import('../resolveTypes.mjs');

const { parseTypeValues, resolveTypeAnnotations } = await createTypeResolver();

const MDN_JS = 'https://developer.mozilla.org/docs/Web/JavaScript';
const STRING = `${MDN_JS}/Data_structures#string_type`;
const NUMBER = `${MDN_JS}/Data_structures#number_type`;
const BOOLEAN = `${MDN_JS}/Data_structures#boolean_type`;
const PROMISE = `${MDN_JS}/Reference/Global_Objects/Promise`;
const MAP = `${MDN_JS}/Reference/Global_Objects/Map`;
const ARRAY = `${MDN_JS}/Reference/Global_Objects/Array`;
const ERROR = `${MDN_JS}/Reference/Global_Objects/Error`;
const ITERABLE = `${MDN_JS}/Reference/Iteration_protocols#the_iterable_protocol`;
const VOID = `${MDN_JS}/Reference/Operators/void`;

/**
 * Resolves a single annotation value and returns its `data`.
 */
const resolve = (value, typeMap = {}) => {
  const node = { type: 'typeAnnotation', value };
  const tree = {
    type: 'root',
    children: [{ type: 'paragraph', children: [node] }],
  };

  resolveTypeAnnotations(tree, typeMap, '/test');

  return node.data;
};

/** Shorthand: `[start, end, href]` triples for terser assertions. */
const linksOf = (value, typeMap) =>
  resolve(value, typeMap).links.map(({ start, end, href }) => [
    start,
    end,
    href,
  ]);

describe('resolveTypeAnnotations', () => {
  it('resolves a JavaScript primitive', () => {
    assert.deepEqual(linksOf('string'), [[0, 6, STRING]]);
  });

  it('resolves a JavaScript global', () => {
    assert.deepEqual(linksOf('Array'), [[0, 5, ARRAY]]);
  });

  it('resolves a type from the type map', () => {
    assert.deepEqual(linksOf('SomeOtherType', { SomeOtherType: 'fromMap' }), [
      [0, 13, 'fromMap'],
    ]);
  });

  it('resolves both parts of a generic', () => {
    assert.deepEqual(linksOf('Promise<string>'), [
      [0, 7, PROMISE],
      [8, 14, STRING],
    ]);
  });

  it('partially resolves a generic when only one part is known', () => {
    assert.deepEqual(linksOf('CustomType<string>'), [[11, 17, STRING]]);
  });

  it('resolves a generic with an inner union', () => {
    assert.deepEqual(linksOf('Promise<string|boolean>'), [
      [0, 7, PROMISE],
      [8, 14, STRING],
      [15, 22, BOOLEAN],
    ]);
  });

  it('resolves multi-parameter generics', () => {
    assert.deepEqual(linksOf('Map<string, number>'), [
      [0, 3, MAP],
      [4, 10, STRING],
      [12, 18, NUMBER],
    ]);
  });

  it('resolves unions (spacing as authored)', () => {
    assert.deepEqual(linksOf('Promise<string|number> | Iterable<boolean>'), [
      [0, 7, PROMISE],
      [8, 14, STRING],
      [15, 21, NUMBER],
      [25, 33, ITERABLE],
      [34, 41, BOOLEAN],
    ]);
  });

  it('resolves intersections', () => {
    assert.deepEqual(linksOf('string&boolean'), [
      [0, 6, STRING],
      [7, 14, BOOLEAN],
    ]);
  });

  it('resolves types inside function signatures, but not parameter names', () => {
    assert.deepEqual(linksOf('(err: Error) => Promise<boolean>'), [
      [6, 11, ERROR],
      [16, 23, PROMISE],
      [24, 31, BOOLEAN],
    ]);
  });

  it('resolves the target of a typeof query', () => {
    assert.deepEqual(linksOf('typeof Compiler', { Compiler: '/api/C' }), [
      [7, 15, '/api/C'],
    ]);
  });

  it('does not confuse identifiers starting with an operator keyword', () => {
    assert.deepEqual(
      linksOf('typeofSomething', { typeofSomething: '/api/t' }),
      [[0, 15, '/api/t']]
    );
  });

  it('resolves array element types (not the brackets)', () => {
    assert.deepEqual(linksOf('string[]'), [[0, 6, STRING]]);
  });

  it('resolves dotted names via the module heuristic', () => {
    assert.deepEqual(linksOf('vm.Module'), [[0, 9, 'vm.html#class-vmmodule']]);
  });

  it('resolves import() types through the dotted heuristic', () => {
    assert.deepEqual(linksOf("import('fs').Stats"), [
      [13, 18, 'fs.html#class-fsstats'],
    ]);
  });

  it('resolves object literal types (nested braces)', () => {
    assert.deepEqual(linksOf('Record<string, {a: number}>'), [
      [7, 13, STRING],
      [19, 25, NUMBER],
    ]);
  });

  it('resolves keyword types: this, null, undefined, void', () => {
    assert.equal(resolve('this').links.length, 1);
    assert.equal(resolve('null').links.length, 1);
    assert.equal(resolve('undefined').links.length, 1);
    assert.deepEqual(linksOf('() => void'), [[6, 10, VOID]]);
  });

  it('resolves deeply nested combinations', () => {
    const value =
      '(str: string[]) => Promise<Map<string, number & string>, Map<string | number>>';

    const hrefs = resolve(value).links.map(({ href }) => href);

    assert.deepEqual(hrefs, [
      STRING,
      PROMISE,
      MAP,
      STRING,
      NUMBER,
      STRING,
      MAP,
      STRING,
      NUMBER,
    ]);
  });

  it('resolves destructured callback signatures', () => {
    const value =
      '(cb: ([first, second]: string[]) => void) => ({ id, name }: User) => boolean';

    const links = resolve(value, { User: 'userLink' }).links;

    assert.deepEqual(
      links.map(({ text }) => text),
      ['string', 'void', 'User', 'boolean']
    );
    assert.equal(links[2].href, 'userLink');
  });

  it('resolves display-name map keys as one whole link', () => {
    assert.deepEqual(
      linksOf('zlib options', { 'zlib options': 'zlib.html#options' }),
      [[0, 12, 'zlib.html#options']]
    );
  });

  describe('invalid annotations', () => {
    it('flags invalid TypeScript and warns', () => {
      warn.mock.resetCalls();

      const data = resolve('), and U+007D (');

      assert.equal(data.parseError, true);
      assert.deepEqual(data.links, []);
      assert.equal(warn.mock.callCount(), 1);
      assert.match(warn.mock.calls[0].arguments[0], /\{\), and U\+007D \(\}/);
      assert.equal(warn.mock.calls[0].arguments[1].file.path, '/test');
    });

    it('does not let one invalid annotation poison the batch', () => {
      const good = { type: 'typeAnnotation', value: 'Promise<string>' };
      const bad = { type: 'typeAnnotation', value: 'not a type!' };
      const tree = {
        type: 'root',
        children: [{ type: 'paragraph', children: [good, bad] }],
      };

      resolveTypeAnnotations(tree, {}, '/test');

      assert.equal(good.data.links.length, 2);
      assert.equal(good.data.parseError, undefined);
      assert.equal(bad.data.parseError, true);
    });

    it('flags statement smuggling as invalid', () => {
      const data = resolve('string; type X = 1');

      assert.equal(data.parseError, true);
    });
  });

  it('leaves unresolvable (but valid) types unlinked without error', () => {
    const data = resolve('SomeUnknownThing');

    assert.deepEqual(data.links, []);
    assert.equal(data.parseError, undefined);
  });

  it('resolves every annotation in a tree (batched)', () => {
    const nodes = ['string', 'Buffer|Blob', 'Promise<integer>'].map(value => ({
      type: 'typeAnnotation',
      value,
    }));
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: nodes }],
    };

    resolveTypeAnnotations(tree, { Buffer: 'buffer.html' }, '/test');

    assert.equal(nodes[0].data.links.length, 1);
    assert.equal(nodes[1].data.links.length, 2);
    assert.equal(nodes[2].data.links.length, 2);
  });
});

describe('parseTypeValues', () => {
  it('parses all values in one batch and maps offsets back', () => {
    const [first, second] = parseTypeValues(['string', 'Map<Buffer, this>']);

    assert.deepEqual(
      first.identifiers.map(({ start, end, text }) => [start, end, text]),
      [[0, 6, 'string']]
    );
    assert.deepEqual(
      second.identifiers.map(({ text }) => text),
      ['Map', 'Buffer', 'this']
    );
    assert.deepEqual(second.identifiers[1], {
      start: 4,
      end: 10,
      text: 'Buffer',
      lookup: 'Buffer',
    });
  });

  it('isolates invalid values without failing the valid ones', () => {
    const [bad, good] = parseTypeValues(['%%%', 'boolean']);

    assert.equal(bad.error, true);
    assert.equal(good.identifiers[0].text, 'boolean');
  });
});
