import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import semver from 'semver';

import { allGenerators } from '../index.mjs';

const validDependencies = Object.keys(allGenerators);

const allGeneratorsReaolved = await Promise.all(
  Object.entries(allGenerators).map(async ([key, loader]) => [
    key,
    await loader(),
  ])
);

describe('All Generators', () => {
  it('should have keys matching their name property', async () => {
    allGeneratorsReaolved.forEach(([key, generator]) => {
      assert.equal(
        key,
        generator.name,
        `Generator key "${key}" does not match its name property "${generator.name}"`
      );
    });
  });

  it('should have valid semver versions', async () => {
    allGeneratorsReaolved.forEach(([key, generator]) => {
      const isValid = semver.valid(generator.version);
      assert.ok(
        isValid,
        `Generator "${key}" has invalid semver version: "${generator.version}"`
      );
    });
  });

  it('should have valid dependsOn references', async () => {
    allGeneratorsReaolved.forEach(([key, generator]) => {
      if (generator.dependsOn) {
        assert.ok(
          validDependencies.includes(generator.dependsOn),
          `Generator "${key}" depends on "${generator.dependsOn}" which is not a valid generator`
        );
      }
    });
  });

  it('should have ast generator as a top-level generator with no dependencies', async () => {
    const ast = await allGenerators.ast();
    assert.ok(ast, 'ast generator should exist');
    assert.equal(
      ast.dependsOn,
      undefined,
      'ast generator should have no dependencies'
    );
  });
});
