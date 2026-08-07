'use strict';

import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { globSync } from 'tinyglobby';

import { combine, hashData, hashValue } from './hash.mjs';

/**
 * Bump to invalidate every existing cache entry and manifest when the cache's
 * own semantics change.
 */
export const CACHE_SCHEMA = 1;

/** @type {Map<string, Promise<string>>} */
const packageSalts = new Map();

/**
 * Finds the directory of the package that owns a resolved generator
 * specifier, by resolving the module and walking up to its `package.json`.
 *
 * @param {string} specifier - Resolved generator import specifier
 * @returns {Promise<string>} Real (symlink-free) package directory
 */
const findPackageDir = async specifier => {
  const modulePath = realpathSync(
    fileURLToPath(import.meta.resolve(specifier))
  );

  let dir = dirname(modulePath);

  while (true) {
    try {
      await readFile(join(dir, 'package.json'));

      return dir;
    } catch {
      const parent = dirname(dir);

      if (parent === dir) {
        throw new Error(`No package.json found above ${modulePath}`);
      }

      dir = parent;
    }
  }
};

/**
 * Computes a salt identifying a package's code. Published installs (real path
 * inside node_modules) are identified by name and version. Anything else — a
 * workspace, an `npm link`, a raw checkout — is a development install whose
 * version never changes while its code does, so the salt is a content hash of
 * the package sources instead.
 *
 * @param {string} pkgDir - Real package directory
 * @returns {Promise<string>} Package salt
 */
const computePackageSalt = async pkgDir => {
  const pkg = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf-8'));

  if (pkgDir.split(sep).includes('node_modules')) {
    return hashData(`${pkg.name}@${pkg.version}`);
  }

  const sources = globSync('src/**/*', {
    cwd: pkgDir,
    onlyFiles: true,
    ignore: ['**/__tests__/**', '**/*.test.mjs'],
  }).sort();

  const hashes = await Promise.all(
    sources.map(
      async rel => `${rel}:${hashData(await readFile(join(pkgDir, rel)))}`
    )
  );

  return hashData(`${pkg.name}@dev\n${hashes.join('\n')}`);
};

/**
 * Memoized package salt for a resolved generator specifier.
 *
 * @param {string} specifier - Resolved generator import specifier
 * @returns {Promise<string>} Package salt
 */
export const packageSalt = specifier => {
  if (!packageSalts.has(specifier)) {
    packageSalts.set(
      specifier,
      findPackageDir(specifier).then(computePackageSalt)
    );
  }

  return packageSalts.get(specifier);
};

/**
 * Salt for one generator: its package's code identity plus its resolved
 * configuration slice (which inherits the global configuration, so parsed
 * changelog/index/version are covered). The output directory is excluded —
 * where output lands does not change what it contains.
 *
 * @param {string} specifier - Resolved generator specifier
 * @param {GeneratorMetadata} generator - Loaded generator
 * @param {import('../utils/configuration/types').Configuration} configuration - Resolved configuration
 * @returns {Promise<string>} Generator salt
 */
const generatorSalt = async (specifier, generator, configuration) => {
  const slice = { ...(configuration[generator.name] ?? {}) };

  delete slice.output;

  return combine(await packageSalt(specifier), hashValue(slice));
};

/**
 * Salt for a target's whole dependency chain: the cache schema, the Node.js
 * major (worker/serialization behavior), and the salt of every generator from
 * the target down to its root. Everything code- and configuration-shaped that
 * can affect the target's output — but not the input files themselves.
 *
 * @param {string} target - Resolved target specifier
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
 * @param {(specifier: string) => string | undefined} resolveDependency - Maps a specifier to its resolved dependency
 * @param {import('../utils/configuration/types').Configuration} configuration - Resolved configuration
 * @returns {Promise<{ salt: string, root: string }>} The chain salt and the chain's root specifier
 */
export const chainSalt = async (
  target,
  generators,
  resolveDependency,
  configuration
) => {
  const parts = [
    `schema:${CACHE_SCHEMA}`,
    `node:${process.versions.node.split('.')[0]}`,
  ];

  let specifier = target;
  let root = target;

  while (specifier) {
    const generator = generators.get(specifier);

    parts.push(await generatorSalt(specifier, generator, configuration));

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
  const { salt, root } = await chainSalt(
    target,
    generators,
    resolveDependency,
    configuration
  );

  const snapshot = await snapshotFor(root);

  return combine(salt, snapshot.digest);
};
