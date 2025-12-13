import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parse } from 'acorn';

import { extractExports } from '../extractExports.mjs';

describe('api-links/utils/extractExports', () => {
  it('extracts assignments to exports.* and indirects', () => {
    const program = parse(
      [
        'exports.foo = function () {}',
        'exports.bar = bar',
        'exports.baz = 123',
      ].join('\n'),
      { ecmaVersion: 'latest', locations: true, sourceType: 'script' }
    );

    const nameToLineNumberMap = {};
    const out = extractExports(program, 'fs', nameToLineNumberMap);

    assert.deepEqual(out.ctors, []);
    assert.deepEqual(out.identifiers, ['baz']);
    assert.deepEqual(out.indirects, { bar: 'fs.bar' });

    assert.equal(nameToLineNumberMap['fs.foo'], 1);
  });

  it('extracts assignments to module.exports forms', () => {
    const program = parse(
      [
        'module.exports = exports = { Foo, bar, baz: deprecate(qux, "x") }',
        'module.exports = new Thing()',
        'module.exports = something',
      ].join('\n'),
      { ecmaVersion: 'latest', locations: true, sourceType: 'script' }
    );

    const nameToLineNumberMap = {};
    const out = extractExports(program, 'buffer', nameToLineNumberMap);

    assert.deepEqual(out.ctors.sort(), ['Foo', 'Thing'].sort());
    assert.deepEqual(
      out.identifiers.sort(),
      ['Foo', 'bar', 'qux', 'something'].sort()
    );
  });

  it('extracts exports from variable declarations that assign to exports/module.exports', () => {
    const program = parse(
      [
        'const x = exports.alpha = 1',
        'const Foo = module.exports = Foo',
        'const y = ignored = 123',
      ].join('\n'),
      { ecmaVersion: 'latest', locations: true, sourceType: 'script' }
    );

    const nameToLineNumberMap = {};
    const out = extractExports(program, 'tls', nameToLineNumberMap);

    assert.deepEqual(out.ctors, ['Foo']);
    assert.deepEqual(out.identifiers, []);

    assert.equal(nameToLineNumberMap['tls.alpha'], 1);
    assert.equal(nameToLineNumberMap['Foo'], 2);
  });
});
