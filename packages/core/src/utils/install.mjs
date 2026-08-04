'use strict';

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

import packageJson from '../../package.json' with { type: 'json' };
import { allGenerators } from '../generators/index.mjs';
import logger from '../logger/index.mjs';

const installLogger = logger.child('install');

/**
 * Lockfiles used to detect which package manager a project uses.
 */
const LOCKFILES = {
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'package-lock.json': 'npm',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
};

/**
 * Extracts the package name from an import specifier
 * (`@scope/package/subpath` or `package/subpath`).
 *
 * @param {string} specifier - A bare import specifier
 * @returns {string} The package name
 */
export const packageForSpecifier = specifier => {
  const segments = specifier.split('/');

  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
};

/**
 * Whether a generator target is a filesystem path (or file URL) rather than
 * a package specifier.
 *
 * @param {string} target - A generator target
 * @returns {boolean}
 */
export const isPathTarget = target =>
  target.startsWith('.') || isAbsolute(target) || target.startsWith('file:');

/**
 * Resolves generator names into the npm packages providing them.
 * Names already provided by this package resolve to no install.
 *
 * With `allowSpecifiers` (used for configuration-file targets), bare import
 * specifiers of third-party generators resolve to their package, and
 * filesystem paths resolve to no install; otherwise only built-in names are
 * accepted, so a typo cannot install an unintended package.
 *
 * @param {string[]} names - Built-in generator names (e.g. `html`), or any
 * generator target when `allowSpecifiers` is set
 * @param {boolean} [allowSpecifiers=false] - Accept non-built-in targets
 * @returns {string[]} Deduplicated package names to install
 * @throws {Error} When a name is not a built-in generator
 */
export const resolveGeneratorPackages = (names, allowSpecifiers = false) => {
  const packages = names.map(name => {
    if (name in allGenerators) {
      return packageForSpecifier(allGenerators[name]);
    }

    if (!allowSpecifiers) {
      throw new Error(
        `"${name}" is not a built-in generator ` +
          `(expected one of: ${Object.keys(allGenerators).join(', ')}). ` +
          'For a third-party generator, install its package with your ' +
          'package manager directly.'
      );
    }

    return isPathTarget(name) ? null : packageForSpecifier(name);
  });

  return [...new Set(packages)].filter(
    name => name && name !== packageJson.name
  );
};

/**
 * Detects the package manager used by the project in `directory`, based on
 * the lockfile present. Defaults to npm.
 *
 * @param {string} directory - The project directory
 * @returns {string} The package manager binary name
 */
export const detectPackageManager = directory => {
  for (const [lockfile, packageManager] of Object.entries(LOCKFILES)) {
    if (existsSync(join(directory, lockfile))) {
      return packageManager;
    }
  }

  return 'npm';
};

/**
 * Whether new packages should be installed as `devDependencies`: mirrors
 * where the project put this package, defaulting to a dev install (doc
 * tooling rarely ships to production).
 *
 * @param {string} directory - The project directory
 * @returns {boolean}
 */
export const isDevInstall = directory => {
  const manifestPath = join(directory, 'package.json');

  if (!existsSync(manifestPath)) {
    return true;
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    return !(packageJson.name in (manifest.dependencies ?? {}));
  } catch {
    return true;
  }
};

/**
 * Builds the argument list for installing packages with a package manager.
 *
 * @param {string} packageManager - The package manager binary name
 * @param {string[]} packages - Package names to install
 * @param {boolean} dev - Whether to install as devDependencies
 * @returns {string[]} The arguments to pass to the package manager
 */
export const buildInstallArguments = (packageManager, packages, dev) => {
  const subcommand = packageManager === 'npm' ? 'install' : 'add';
  // yarn and bun spell it `--dev`; npm and pnpm accept `--save-dev`
  const devFlag = ['yarn', 'bun'].includes(packageManager)
    ? '--dev'
    : '--save-dev';

  return [subcommand, ...(dev ? [devFlag] : []), ...packages];
};

/**
 * Installs the packages providing the given generators with the project's
 * package manager.
 *
 * @param {string[]} names - Generator targets (see
 * {@link resolveGeneratorPackages})
 * @param {boolean} [allowSpecifiers=false] - Accept non-built-in targets
 * @returns {string[]} The installed package names (empty when everything was
 * already part of this package)
 * @throws {Error} When the package manager exits unsuccessfully
 */
export const installGeneratorPackages = (names, allowSpecifiers = false) => {
  const packages = resolveGeneratorPackages(names, allowSpecifiers);

  if (!packages.length) {
    return packages;
  }

  const packageManager = detectPackageManager(process.cwd());
  const args = buildInstallArguments(
    packageManager,
    packages,
    isDevInstall(process.cwd())
  );

  installLogger.info(`Running \`${packageManager} ${args.join(' ')}\``);

  const { status, error } = spawnSync(packageManager, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (error) {
    throw error;
  }

  if (status !== 0) {
    throw new Error(`\`${packageManager}\` exited with status ${status}`);
  }

  return packages;
};
