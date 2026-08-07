'use strict';

import { combine, hashValue } from './hash.mjs';

/**
 * The only code-identity salt. Bump it in any release whose generated output
 * differs (and whenever the cache's own semantics change) to invalidate every
 * existing entry; releases that don't change output leave caches valid. When
 * hacking on generator code locally, build with `--force`.
 */
export const CACHE_SCHEMA = 1;

/**
 * Salt for one generator: its name plus its resolved configuration slice
 * (which inherits the global configuration, so parsed changelog/index/version
 * are covered). The output directory is excluded — where output lands does
 * not change what it contains.
 *
 * @param {GeneratorMetadata} generator - Loaded generator
 * @param {import('../utils/configuration/types').Configuration} configuration - Resolved configuration
 * @returns {string} Generator salt
 */
const generatorSalt = (generator, configuration) => {
  const slice = { ...(configuration[generator.name] ?? {}) };

  delete slice.output;

  return hashValue({ name: generator.name, config: slice });
};

/**
 * Salt for a target's whole dependency chain: the cache schema plus the salt
 * of every generator from the target down to its root. Everything
 * configuration-shaped that can affect the target's output — but not the
 * input files themselves.
 *
 * @param {string} target - Resolved target specifier
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
 * @param {(specifier: string) => string | undefined} resolveDependency - Maps a specifier to its resolved dependency
 * @param {import('../utils/configuration/types').Configuration} configuration - Resolved configuration
 * @returns {{ salt: string, root: string }} The chain salt and the chain's root specifier
 */
export const chainSalt = (
  target,
  generators,
  resolveDependency,
  configuration
) => {
  const parts = [`schema:${CACHE_SCHEMA}`];

  let specifier = target;
  let root = target;

  while (specifier) {
    parts.push(generatorSalt(generators.get(specifier), configuration));

    root = specifier;
    specifier = resolveDependency(specifier);
  }

  return { salt: combine(...parts), root };
};

/**
 * Aggregate key for a target: its chain salt plus the content digest of its
 * root's input snapshot. Equality of this key means the target's outputs are
 * already on disk and correct.
 *
 * @param {string} target - Resolved target specifier
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
 * @param {(specifier: string) => string | undefined} resolveDependency - Maps a specifier to its resolved dependency
 * @param {import('../utils/configuration/types').Configuration} configuration - Resolved configuration
 * @param {(rootSpecifier: string) => Promise<import('./types').Snapshot>} snapshotFor - Snapshot accessor per root generator
 * @returns {Promise<string>} Aggregate key
 */
export const aggregateKey = async (
  target,
  generators,
  resolveDependency,
  configuration,
  snapshotFor
) => {
  const { salt, root } = chainSalt(
    target,
    generators,
    resolveDependency,
    configuration
  );

  const snapshot = await snapshotFor(root);

  return combine(salt, snapshot.digest);
};
