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

test('checkIndirectReferences exits when there are no indirect references', async () => {
  const source = `function Buffer() {}`;

  const program = await parseProgram(source);

  const exports = {
    ctors: [],
    identifiers: [],
    indirects: {},
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

test('extractExports handles nested exports member assignments', async () => {
  const source = `exports.foo.bar = function () {};`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result, {
    ctors: [],
    identifiers: [],
    indirects: {},
  });

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

test('extractExports handles non-identifier exports assignments', async () => {
  const source = `exports.foo = {};
exports[bar] = {};
exports['baz'] = {};`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.identifiers, ['foo', 'bar']);
  assert.deepEqual(result.indirects, {});
});

test('extractExports handles module.exports constructor', async () => {
  const source = `module.exports = new Buffer();`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.ctors, ['Buffer']);
});

test('extractExports resolves chained module.exports assignments', async () => {
  const source = `module.exports = exports.foo = new Buffer();`;

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

test('extractExports handles deprecated and ignored object exports', async () => {
  const source = `module.exports = {
  oldFn: deprecate(oldFn),
  ignoredCall: wrap(ignoredCall),
  ignoredLiteral: 1
};`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.identifiers, ['oldFn']);
  assert.deepEqual(result.ctors, []);
});

test('extractExports handles module.exports identifier exports', async () => {
  const source = `module.exports = api;`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.identifiers, ['api']);
  assert.deepEqual(result.ctors, []);
});

test('extractExports handles module.exports constructor identifier exports', async () => {
  const source = `module.exports = Buffer;`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.identifiers, ['Buffer']);
  assert.deepEqual(result.ctors, ['Buffer']);
});

test('extractExports ignores unsupported module.exports assignments', async () => {
  const source = `module.exports = 1;`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result, {
    ctors: [],
    identifiers: [],
    indirects: {},
  });
});

test('extractExports handles variable declaration export aliases', async () => {
  const source = `const foo = exports.foo = function () {};
const Buffer = module.exports = function Buffer() {};
const ignoredProperty = module.foo = function () {};
const ignoredTarget = local.foo = function () {};
const ignoredValue = 1;`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result.ctors, ['Buffer']);
  assert.equal(map['api.foo'], 1);
  assert.equal(map.Buffer, 2);
});

test('extractExports ignores expressions that are not export writes', async () => {
  const source = `foo;
foo = 1;`;

  const program = await parseProgram(source);

  const map = {};

  const result = extractExports(program, 'api', map);

  assert.deepEqual(result, {
    ctors: [],
    identifiers: [],
    indirects: {},
  });
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

test('findDefinitions ignores unexported function declarations', async () => {
  const source = `function foo() {}`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: [],
    identifiers: [],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.deepEqual(map, {});
});

test('findDefinitions ignores exported function declarations for private modules', async () => {
  const source = `function foo() {}`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: [],
    identifiers: ['foo'],
    indirects: {},
  };

  findDefinitions(program, '_api', map, exports);

  assert.deepEqual(map, {});
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

test('findDefinitions ignores expressions that are not definition writes', async () => {
  const source = `Buffer;
Buffer = function () {};`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: ['Buffer'],
    identifiers: [],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.deepEqual(map, {});
});

test('findDefinitions ignores unsupported assignment targets', async () => {
  const source = `Buffer.static.property = function () {};
getTarget().method = function () {};`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: ['Buffer'],
    identifiers: [],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.deepEqual(map, {});
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

test('findDefinitions ignores unexported classes and class fields', async () => {
  const source = `class Internal {
  method() {}
}

class Public {
  field = 1;
  method() {}
}`;

  const program = await parseProgram(source);

  const map = {};

  const exports = {
    ctors: ['Public'],
    identifiers: [],
    indirects: {},
  };

  findDefinitions(program, 'api', map, exports);

  assert.deepEqual(map, {
    Public: 5,
    'public.method': 7,
  });
});
