'use strict';

import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { isAbsolute } from 'node:path';
import process from 'node:process';
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

let npmGlobalRoot;

/**
 * Asking npm for its global root spawns a process, so only do it when a
 * generator package is neither installed alongside core nor in the invoking
 * project, and remember the answer (`''` = npm unavailable).
 *
 * @returns {string} The npm global `node_modules` directory, or `''`
 */
const getNpmGlobalRoot = () => {
  if (npmGlobalRoot === undefined) {
    try {
      npmGlobalRoot = execSync('npm root -g', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      npmGlobalRoot = '';
    }
  }

  return npmGlobalRoot;
};

/**
 * Resolves a specifier starting from the given directory's `node_modules`
 * hierarchy instead of core's own location.
 *
 * @param {string} specifier - Bare package specifier
 * @param {string} base - Directory to resolve from
 * @returns {string | undefined} File URL of the resolved module, if found
 */
const tryResolveFrom = (specifier, base) => {
  if (!base) {
    return undefined;
  }

  const require = createRequire(import.meta.url);

  try {
    return pathToFileURL(require.resolve(specifier, { paths: [base] })).href;
  } catch {
    return undefined;
  }
};

/**
 * Resolves a generator package from the invoking project or the npm global
 * root. One-shot runs (`npx @doc-kit/cli`) install core into the npx cache,
 * where a bare import() cannot see generator packages the user has installed
 * locally or globally.
 *
 * @param {string} specifier - Bare package specifier that failed to import
 * @returns {string | undefined} File URL of the resolved module, if found
 */
const resolveInstalledPackage = specifier =>
  tryResolveFrom(specifier, process.cwd()) ??
  tryResolveFrom(specifier, getNpmGlobalRoot());

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
    if (error.code !== 'ERR_MODULE_NOT_FOUND') {
      throw error;
    }

    const installed = resolveInstalledPackage(resolved);

    if (!installed) {
      throw new Error(
        `Could not load generator "${specifier}" (resolved to "${resolved}"). ` +
          'If it lives in a separate package, make sure that package is ' +
          'installed in your project or globally.',
        { cause: error }
      );
    }

    module = await import(installed);
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
