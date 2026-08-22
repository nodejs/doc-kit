import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cpus } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMainThread } from 'node:worker_threads';

import { cosmiconfig } from 'cosmiconfig';
import { coerce } from 'semver';

import {
  loadGenerators,
  resolveGeneratorSpecifier,
} from '#generators/loader.mjs';
import logger from '#logger/index.mjs';
import { parseChangelog, parseIndex } from '#parsers/markdown.mjs';
import { enforceArray } from '#utils/array.mjs';
import { leftHandAssign } from '#utils/generators.mjs';
import { deepMerge } from '#utils/misc.mjs';

const configExplorer = cosmiconfig('doc-kit');

/**
 * The name of the project being documented, from the manifest in the working
 * directory. Generators use it for titles, logos, and templated text.
 *
 * @returns {string | undefined}
 */
const detectProject = () => {
  try {
    return JSON.parse(readFileSync('package.json', 'utf-8')).name;
  } catch {
    return undefined;
  }
};

/**
 * Get's the default configuration for the loaded generators
 *
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
 * @param {Partial<import('./types').Configuration>} config - The user configuration
 */
export const getDefaultConfig = (generators, config) =>
  [...generators.values()].reduce(
    (acc, generator) => {
      acc[generator.name] =
        'defaultConfiguration' in generator
          ? typeof generator.defaultConfiguration === 'function'
            ? generator.defaultConfiguration(config)
            : generator.defaultConfiguration
          : {};

      return acc;
    },
    /** @type {import('./types').Configuration} */ ({
      global: {
        project: detectProject() ?? 'API Docs',
        version: process.version,
        minify: true,
        ref: 'HEAD',
        // Without release history there is nothing to build a version picker
        // from, so generators render single-version output.
        changelog: [],
        pathsToCopy: ['assets', 'public', 'static'],
      },

      // The number of wasm memory instances is severely limited on
      // riscv64 with sv39. Running multiple generators that use wasm in
      // parallel could cause failures to allocate new wasm instance.
      // See also https://github.com/nodejs/node/pull/60591
      threads: process.arch === 'riscv64' ? 1 : cpus().length,
      chunkSize: 10,
    })
  );

/**
 * Resolves an `extends` entry of a configuration file into an importable
 * URL: relative paths resolve against the configuration file, anything else
 * resolves as a package import specifier (e.g. `@node-core/doc-kit/config`).
 *
 * @param {string} specifier - The `extends` entry
 * @param {string} configFilePath - The configuration file it appears in
 * @returns {string} A `file:` URL to import
 */
const resolveConfigExtends = (specifier, configFilePath) => {
  if (specifier.startsWith('.') || isAbsolute(specifier)) {
    return pathToFileURL(resolve(dirname(configFilePath), specifier)).href;
  }

  return pathToFileURL(createRequire(configFilePath).resolve(specifier)).href;
};

/**
 * Loads an explicit configuration file or searches for one using cosmiconfig.
 *
 * @param {string} [filePath] - The path to an explicit configuration file
 * @returns {Promise<Partial<import('./types').Configuration>>} The loaded configuration object, or an empty object if none is found
 */
export const loadConfigFile = async filePath => {
  const result = filePath
    ? await configExplorer.load(filePath)
    : await configExplorer.search();

  if (!result) {
    return {};
  }

  let { extends: presets, ...config } = result.config ?? {};

  for (const preset of enforceArray(presets ?? []).toReversed()) {
    const module = await import(resolveConfigExtends(preset, result.filepath));

    config = deepMerge(module.default ?? module, config);
  }

  return config;
};

/**
 * Transforms configuration values that need async processing or coercion.
 * Only processes values that haven't been transformed yet (strings for changelog/index, non-coerced versions).
 *
 * @param {import('./types').GlobalConfiguration} value
 * @returns {Promise<import('./types').GlobalConfiguration>}
 */
const transformConfig = async value => {
  // Only coerce if it's a string (not already coerced)
  if (value.version && typeof value.version === 'string') {
    value.version = coerce(value.version);
  }

  // Only parse if it's not already parsed
  if (value.changelog && !Array.isArray(value.changelog)) {
    value.changelog = await parseChangelog(value.changelog);
  }

  // Only parse if it's not already parsed
  if (value.index && !Array.isArray(value.index)) {
    value.index = await parseIndex(value.index);
  }

  return value;
};

/**
 * Converts CLI options into a config
 * @param {import('../../../bin/commands/generate.mjs').CLIOptions} options
 * @returns {import('./types').Configuration}
 */
export const createConfigFromCLIOptions = options => ({
  global: {
    input: options.input,
    ignore: options.ignore,
    output: options.output,
    minify: options.minify,
    ref: options.gitRef,
    version: options.version,
    changelog: options.changelog,
    index: options.index,
  },
  metadata: {
    typeMap: options.typeMap,
  },
  target: options.target,
  threads: options.threads,
  chunkSize: options.chunkSize,
});

/**
 * Asserts that the resolved configuration has everything needed to run:
 * at least one generator `target` and an `input` to read source files from.
 * These may come from CLI flags or a config file; by this point both sources
 * have been merged, so we validate the result rather than the raw options.
 *
 * @param {import('./types').Configuration} config - The merged configuration
 */
export const assertRunnableOptions = config => {
  if (!config.target || !config.global?.input) {
    throw new Error(
      'Both a `target` and an `input` must be provided, either via ' +
        '`--target`/`--input` or a configuration file. ' +
        'Run `doc-kit generate --help` for usage.'
    );
  }
};

/**
 * Creates a complete run configuration by merging config file, user options, and defaults.
 * Processes and validates configuration values including version coercion, changelog parsing,
 * and constraint enforcement for threads and chunk size.
 *
 * @param {import('../../../bin/commands/generate.mjs').CLIOptions} options - User-provided configuration options
 * @returns {Promise<import('./types').Configuration>} The configuration
 */
export const createRunConfiguration = async options => {
  const config = await loadConfigFile(options.configFile);
  config.target &&= enforceArray(config.target);

  // Resolve user configuration first so dynamic defaults can use it
  const cliConfig = createConfigFromCLIOptions(options);
  const intermediate = deepMerge(config, cliConfig);

  // Resolve shorthand targets into import specifiers, then load the requested
  // generators (and their dependency closure) so their defaults can be applied
  intermediate.target &&= intermediate.target.map(resolveGeneratorSpecifier);
  const generators = await loadGenerators(intermediate.target ?? []);

  const merged = deepMerge(
    getDefaultConfig(generators, intermediate),
    intermediate
  );

  // These need to be coerced
  merged.threads = Math.max(merged.threads, 1);
  merged.chunkSize = Math.max(merged.chunkSize, 1);

  if (process.arch === 'riscv64' && merged.threads > 1) {
    logger.warn(
      `Using ${merged.threads} threads might cause failures when ` +
        'allocating wasm memory due to insufficient virtual address space ' +
        'on riscv64 with sv39. Please consider using only a single thread.'
    );
  }

  // Transform global config if it wasn't already done
  await transformConfig(merged.global);

  // Now assign to each generator config (they inherit from global)
  await Promise.all(
    [...generators.values()].map(async ({ name }) => {
      const value = merged[name];

      // Transform generator-specific overrides
      await transformConfig(value);

      // Assign from global (this populates missing values from global)
      leftHandAssign(value, merged.global);
    })
  );

  return merged;
};

/** @type {import('./types').Configuration} */
let config;

/**
 * Configuration setter
 * @param {import('./types').Configuration | import('../../../bin/commands/generate.mjs').CLIOptions} options
 * @returns {Promise<import('./types').Configuration>}
 */
export const setConfig = async options =>
  (config = isMainThread ? await createRunConfiguration(options) : options);

/**
 * Configuration getter
 * @template {keyof import('./types').Configuration} T
 * @param {T} generator
 * @returns {T extends keyof import('./types').Configuration ? import('./types').Configuration[T] : import('./types').Configuration}
 */
const getConfig = generator => (generator ? config[generator] : config);

export default getConfig;
