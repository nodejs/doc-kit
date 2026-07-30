'use strict';

import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

import { allGenerators } from './index.mjs';

/**
 * Resolves a CLI/configuration target into an import specifier. Shorthand
 * names map through the alias table; filesystem paths become file URLs;
 * anything else is treated as an import specifier already.
 *
 * Resolution is idempotent, so already-resolved specifiers pass through.
 *
 * @param {string} target - Shorthand name, path, or import specifier
 * @returns {string} The import specifier to load the generator from
 */
export const resolveGeneratorSpecifier = target => {
  if (target in allGenerators) {
    return allGenerators[target];
  }

  if (target.startsWith('.') || isAbsolute(target)) {
    return pathToFileURL(target).href;
  }

  return target;
};

/**
 * Imports a generator by specifier and returns its default export.
 *
 * @param {string} specifier - Shorthand name, path, or import specifier
 * @returns {Promise<GeneratorMetadata>}
 */
export const loadGenerator = async specifier => {
  const resolved = resolveGeneratorSpecifier(specifier);

  /** @type {{ default?: GeneratorMetadata }} */
  let module;

  try {
    module = await import(resolved);
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        `Could not load generator "${specifier}" (resolved to "${resolved}"). ` +
          'If it lives in a separate package, make sure that package is installed.',
        { cause: error }
      );
    }

    throw error;
  }

  const generator = module.default;

  if (!generator?.name || typeof generator.generate !== 'function') {
    throw new Error(
      `"${specifier}" is not a generator: expected a default export ` +
        'with a `name` and a `generate` function.'
    );
  }

  return generator;
};

/**
 * Loads the given generators plus the transitive closure of their
 * dependencies (via `dependsOn`).
 *
 * @param {string[]} targets - Shorthand names, paths, or import specifiers
 * @returns {Promise<Map<string, GeneratorMetadata>>} Loaded generators keyed
 * by their resolved specifier
 */
export const loadGenerators = async targets => {
  const generators = new Map();
  const queue = targets.map(resolveGeneratorSpecifier);

  while (queue.length > 0) {
    const specifier = queue.shift();

    if (generators.has(specifier)) {
      continue;
    }

    const generator = await loadGenerator(specifier);
    generators.set(specifier, generator);

    if (generator.dependsOn) {
      queue.push(resolveGeneratorSpecifier(generator.dependsOn));
    }
  }

  return generators;
};
