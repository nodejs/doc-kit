import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import createProgramGenerators, {
  createImportDeclaration,
} from '../generate.mjs';

test('createImportDeclaration - side-effect-only import (no name)', () => {
  const result = createImportDeclaration(null, './styles.css');
  assert.equal(result, 'import "./styles.css";');
});

test('createImportDeclaration - default import', () => {
  const result = createImportDeclaration('React', 'react', true);
  assert.equal(result, 'import React from "react";');
});

test('createImportDeclaration - default import with useDefault=true (default)', () => {
  const result = createImportDeclaration('Component', './component.jsx');
  assert.equal(result, 'import Component from "./component.jsx";');
});

test('createImportDeclaration - named import', () => {
  const result = createImportDeclaration('useState', 'react', false);
  assert.equal(result, 'import { useState } from "react";');
});

test('createImportDeclaration - handles backslashes in path', () => {
  const result = createImportDeclaration('Comp', 'C:\\path\\to\\file.jsx');
  assert.equal(result, 'import Comp from "C:\\\\path\\\\to\\\\file.jsx";');
});

test('createImportDeclaration - handles backslashes in side-effect import', () => {
  const result = createImportDeclaration(null, 'D:\\styles\\main.css');
  assert.equal(result, 'import "D:\\\\styles\\\\main.css";');
});

test('buildClientProgram - generates hydration code', () => {
  const { buildClientProgram } = createProgramGenerators();
  const componentCode = '<App />';
  const result = buildClientProgram(componentCode);

  // Check for key imports and hydration call
  assert.match(result, /import.*from "preact"/);
  assert.match(result, /import { hydrate } from "preact"/);
  assert.match(
    result,
    /hydrate\(<App \/>, document\.getElementById\("root"\)\);/
  );
  assert.match(result, /import ".*\/ui\/index\.css"/);
});

test('buildClientProgram - includes JSX component imports', () => {
  const { buildClientProgram } = createProgramGenerators();
  const result = buildClientProgram('<NavBar />');

  // Should include imports from JSX_IMPORTS
  assert.match(result, /import NavBar from/);
  assert.match(result, /import SideBar from/);
  assert.match(result, /import CodeBox from/);
});

test('buildClientProgram - includes named imports for MDX components', () => {
  const { buildClientProgram } = createProgramGenerators();
  const result = buildClientProgram('<MDXTooltip />');

  // Should include named imports with curly braces
  assert.match(result, /import { MDXTooltip } from/);
});

test('buildServerProgram - generates SSR code', () => {
  const { buildServerProgram } = createProgramGenerators();
  const componentCode = '<App />';
  const result = buildServerProgram(componentCode);

  // Check for SSR imports and render call
  assert.match(result, /import { render } from "preact-render-to-string"/);
  assert.match(result, /return render\(<App \/>\);/);
});

test('buildServerProgram - includes JSX component imports', () => {
  const { buildServerProgram } = createProgramGenerators();
  const result = buildServerProgram('<MetaBar />');

  // Should include imports from JSX_IMPORTS
  assert.match(result, /import NavBar from/);
  assert.match(result, /import MetaBar from/);
  assert.match(result, /import CodeTabs from/);
});

test('buildServerProgram - uses newlines for readability', () => {
  const { buildServerProgram } = createProgramGenerators();
  const result = buildServerProgram('<App />');

  // Server program should have newline separators
  assert.match(result, /\n/);
  const lines = result.split('\n');
  assert.ok(lines.length > 3, 'Should have multiple lines');
});

test('buildClientProgram - concatenates without newlines', () => {
  const { buildClientProgram } = createProgramGenerators();
  const result = buildClientProgram('<App />');

  // Client program concatenates all imports together
  // Check that imports appear immediately one after another
  assert.ok(!result.includes('\n'), 'Should not contain newlines');
});

test('buildServerProgram - returns value from render', () => {
  const { buildServerProgram } = createProgramGenerators();
  const result = buildServerProgram('<Component prop="value" />');

  // Should return the result of render()
  assert.match(result, /return render\(<Component prop="value" \/>\);/);
});

test('createProgramGenerators - returns both generator functions', () => {
  const generators = createProgramGenerators();

  assert.ok(typeof generators === 'object');
  assert.ok(typeof generators.buildClientProgram === 'function');
  assert.ok(typeof generators.buildServerProgram === 'function');
});
