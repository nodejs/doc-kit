import { cpus } from 'node:os';
import { isMainThread } from 'node:worker_threads';

import { coerce } from 'semver';

import { CHANGELOG_URL, populate } from './templates.mjs';
import { allGenerators } from '../../generators/index.mjs';
import { parseChangelog, parseIndex } from '../../parsers/markdown.mjs';
import { enforceArray } from '../array.mjs';
import { leftHandAssign } from '../generators.mjs';
import { deepMerge, lazy } from '../misc.mjs';
import { importFromURL } from '../url.mjs';

/**
 * Get's the default configuration
 */
export const getDefaultConfig = lazy(async () => {
  const defaults = /** @type {import('./types').Configuration} */ ({
    global: {
      version: process.version,
      minify: true,
      repository: 'nodejs/node',
      ref: 'HEAD',
      baseURL: 'https://nodejs.org/docs',
      changelog: populate(CHANGELOG_URL, {
        repository: 'nodejs/node',
        ref: 'HEAD',
      }),
    },

    threads: cpus().length,
    chunkSize: 10,
  });

  await Promise.all(
    Object.keys(allGenerators).map(async k => {
      const generator = await allGenerators[k]();
      defaults[k] = generator.defaultConfiguration ?? {};
    })
  );

  return defaults;
});

/**
 * Loads a configuration file from a URL or file path.
 *
 * @param {string} filePath - The URL or file path to the configuration file
 * @returns {Promise<Partial<import('./types').Configuration>>} The imported configuration object, or an empty object if no path provided
 */
export const loadConfigFile = filePath =>
  filePath ? importFromURL(filePath) : {};

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

  // Merge with defaults
  const merged = deepMerge(
    config,
    createConfigFromCLIOptions(options),
    await getDefaultConfig()
  );

  // These need to be coerced
  merged.threads = Math.max(merged.threads, 1);
  merged.chunkSize = Math.max(merged.chunkSize, 1);

  // Transform global config if it wasn't already done
  await transformConfig(merged.global);

  // Now assign to each generator config (they inherit from global)
  await Promise.all(
    Object.keys(allGenerators).map(async k => {
      const value = merged[k];

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
