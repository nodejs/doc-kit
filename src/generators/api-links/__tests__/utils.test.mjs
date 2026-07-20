import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parse } from 'oxc-parser';

import { checkIndirectReferences } from '../utils/checkIndirectReferences.mjs';
import { extractExports } from '../utils/extractExports.mjs';
import { findDefinitions } from '../utils/findDefinitions.mjs';

async function parseProgram(source) {
  const result = await parse('test.js', source, {
    lang: 'js',
    sourceType: 'commonjs',
    range: true,
  });

  // oxc-parser's ParseResult doesn't attach the original source text to
  // `program`, but checkIndirectReferences/findDefinitions rely on
  // `program.sourceText` to compute real line numbers via getLineNumber.
  // Without this, getLineNumber falls back to a default and line numbers
  // silently come back wrong for anything beyond a single line.
  result.program.sourceText = source;

  return result.program;
}

test('checkIndirectReferences resolves indirect function references', async () => {
  const source = `exports.Buffer = Buffer;

function Buffer() {}`;

  const program = await parseProgram(source);

  const exports = {
    ctors: [],
    identifiers: [],
    indirects: {
      Buffer: 'buffer.Buffer',
    },
  };

  const map = {};

  checkIndirectReferences(program, exports, map);

  assert.equal(map['buffer.Buffer'], 3);
});

test('checkIndirectReferences ignores unknown functions', async () => {
  const source = `function Other() {}`;

  const program = await parseProgram(source);

  const exports = {
    ctors: [],
    identifiers: [],
    indirects: {
      Buffer: 'buffer.Buffer',
    },
  };

  const map = {};

  checkIndirectReferences(program, exports, map);

  assert.deepEqual(map, {});
});

test('extractExports handles exports.function assignment', async () => {
  const source = `exports.foo = function () {};`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.ctors, []);
  assert.deepEqual(result.identifiers, []);
  assert.deepEqual(result.indirects, {});

  assert.equal(map['api.foo'], 1);
});

test('extractExports handles indirect exports', async () => {
  const source = `exports.Buffer = Buffer;`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.indirects, {
    Buffer: 'api.Buffer',
  });
});

test('extractExports handles module.exports constructor', async () => {
  const source = `module.exports = new Buffer();`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.ctors, ['Buffer']);
});

test('extractExports handles module.exports object exports', async () => {
  const source = `module.exports = {
  Buffer,
  foo
};`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.identifiers, ['Buffer', 'foo']);

  assert.deepEqual(result.ctors, ['Buffer']);
});

test('findDefinitions finds exported function declaration', async () => {
  const source = `exports.foo = foo;

function foo() {}`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: [],
    identifiers: ['foo'],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.equal(map['api.foo'], 3);
});

test('findDefinitions finds prototype assignments', async () => {
  const source = `Buffer.prototype.write = function () {};`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: ['Buffer'],
    identifiers: [],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.equal(map['buf.write'], 1);
});

test('findDefinitions tracks prototype indirect references', async () => {
  const source = `Buffer.prototype.write = write;`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: ['Buffer'],
    identifiers: [],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.equal(map['buf.write'], 1);

  assert.deepEqual(exports.indirects, {
    write: 'buf.write',
  });
});

test('findDefinitions finds class constructors and methods', async () => {
  const source = `class Buffer {
  constructor() {}
  write() {}
}`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: ['Buffer'],
    identifiers: [],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.equal(map.Buffer, 1);
  assert.equal(map['new Buffer'], 2);
  assert.equal(map['buffer.write'], 3);
});
