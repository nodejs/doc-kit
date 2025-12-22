import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import createBuilders, { createImportDeclaration } from '../generate.mjs';

describe('generators/web/utils - generate', () => {
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
});
