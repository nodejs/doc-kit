'use strict';

/** @type {Map<string, object>} */
const cache = new Map();

/**
 * Loads a generator by its import specifier.
 * Imports the single entry point which exports generate, processChunk,
 * name, dependsOn, and defaultConfiguration.
 *
 * @param {string} specifier - Full import specifier (e.g. '@node-core/doc-kit/generators/ast')
 * @returns {Promise<object>} The loaded generator
 */
export const loadGenerator = async specifier => {
  if (cache.has(specifier)) {
    return cache.get(specifier);
  }

  const module = await import(specifier);

  const generator = {
    specifier,
    ...module,
  };

  cache.set(specifier, generator);

  return generator;
};

/**
 * Resolves the full dependency chain for a set of target specifiers.
 * Recursively follows `dependsOn` chains, loading each generator.
 *
 * @param {string[]} targets - Target generator specifiers
 * @returns {Promise<Map<string, object>>} All generators needed, keyed by specifier
 */
export const resolveGeneratorGraph = async targets => {
  /** @type {Map<string, object>} */
  const loaded = new Map();

  /**
   * Resolve a generator via it's specifier
   * @param {string} specifier
   */
  const resolve = async specifier => {
    if (loaded.has(specifier)) {
      return;
    }

    const generator = await loadGenerator(specifier);
    loaded.set(specifier, generator);

    if (generator.dependsOn) {
      await resolve(generator.dependsOn);
    }
  };

  for (const target of targets) {
    await resolve(target);
  }

  return loaded;
};
