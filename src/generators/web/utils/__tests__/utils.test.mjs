import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createChunkedRequire } from '../chunks.mjs';
import cssPlugin from '../css.mjs';
import createBuilders, { createImportDeclaration } from '../generate.mjs';

describe('generators/web/utils', () => {
  it('createChunkedRequire resolves virtual chunks and falls back to require', () => {
    const chunks = [
      { fileName: 'a.js', code: 'module.exports = { val: 1 };' },
      {
        fileName: 'b.js',
        code: 'const a = require("./a.js"); module.exports = { val: a.val + 1 };',
      },
    ];

    const fakeRequire = path => {
      if (path === 'fs') {
        return { read: true };
      }
      return null;
    };

    const req = createChunkedRequire(chunks, fakeRequire);

    // resolve virtual module
    const a = req('./a.js');
    assert.deepEqual(a, { val: 1 });

    // module that requires another virtual module
    const b = req('./b.js');
    assert.deepEqual(b, { val: 2 });

    // fallback to external
    const ext = req('fs');
    assert.deepEqual(ext, { read: true });
  });

  it('createImportDeclaration produces correct import strings', () => {
    // side-effect import
    assert.equal(
      createImportDeclaration(null, './style.css'),
      'import "./style.css";'
    );

    // default import
    assert.equal(
      createImportDeclaration('X', './mod'),
      'import X from "./mod";'
    );

    // named import
    assert.equal(
      createImportDeclaration('Y', './mod', false),
      'import { Y } from "./mod";'
    );
  });

  it('builders produce client and server programs containing expected markers', () => {
    const { buildClientProgram, buildServerProgram } = createBuilders();

    const client = buildClientProgram('MyComp()');
    assert.match(client, /hydrate\(MyComp\(\)/);
    assert.match(client, /index\.css/);

    const server = buildServerProgram('MyComp()');
    assert.match(server, /return render\(MyComp\(\)\);/);
  });

  it('css plugin buildEnd is a no-op when no chunks processed', () => {
    const plugin = cssPlugin();

    let emitted = null;
    const thisArg = { emitFile: info => (emitted = info) };

    // Should not throw and should not emit anything
    plugin.buildEnd.call(thisArg);
    assert.equal(emitted, null);
  });
});
