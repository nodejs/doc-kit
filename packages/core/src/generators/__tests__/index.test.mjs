import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  allGenerators,
  deprecatedGenerators,
  publicGenerators,
} from '../index.mjs';
import { loadGenerator, resolveGeneratorSpecifier } from '../loader.mjs';

const validDependencies = Object.values(allGenerators);

// Deprecated aliases intentionally have keys that differ from the
// generator's name, so they are excluded from the name-match assertions.
const currentGenerators = Object.fromEntries(
  Object.entries(allGenerators).filter(
    ([name]) => !(name in deprecatedGenerators)
  )
);

const loadedGenerators = await Promise.all(
  Object.entries(currentGenerators).map(async ([name, specifier]) => [
    name,
    specifier,
    await loadGenerator(specifier),
  ])
);

describe('All Generators', () => {
  it('should expose public generators as a subset of all generators', () => {
    Object.entries(publicGenerators).forEach(([name, specifier]) => {
      assert.equal(allGenerators[name], specifier);
    });
  });

  it('should resolve shorthand names to their specifiers', () => {
    Object.entries(allGenerators).forEach(([name, specifier]) => {
      assert.equal(resolveGeneratorSpecifier(name), specifier);
      // Resolution must be idempotent for already-resolved specifiers
      assert.equal(resolveGeneratorSpecifier(specifier), specifier);
    });
  });

  it('should have shorthand names matching their name property', () => {
    loadedGenerators.forEach(([name, , generator]) => {
      assert.equal(
        name,
        generator.name,
        `Alias "${name}" does not match its name property "${generator.name}"`
      );
    });
  });

  it('should have valid dependsOn references', () => {
    loadedGenerators.forEach(([name, , generator]) => {
      if (generator.dependsOn) {
        assert.ok(
          validDependencies.includes(generator.dependsOn),
          `Generator "${name}" depends on "${generator.dependsOn}" which is not a valid generator specifier`
        );
      }
    });
  });

  it('should resolve deprecated aliases to loadable generators', async () => {
    for (const [name, specifier] of Object.entries(deprecatedGenerators)) {
      assert.equal(resolveGeneratorSpecifier(name), specifier);

      const generator = await loadGenerator(specifier);
      assert.ok(generator.name, `Deprecated alias "${name}" must load`);
    }
  });

  it('should have ast generator as a top-level generator with no dependencies', async () => {
    const ast = await loadGenerator(allGenerators.ast);
    assert.ok(ast, 'ast generator should exist');
    assert.equal(
      ast.dependsOn,
      undefined,
      'ast generator should have no dependencies'
    );
  });
});
