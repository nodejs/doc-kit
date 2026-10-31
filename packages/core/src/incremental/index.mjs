'use strict';

import { existsSync } from 'node:fs';
import { rm, rmdir } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';

import logger from '#logger/index.mjs';
import { enforceArray } from '#utils/array.mjs';
import { omitKeys } from '#utils/misc.mjs';

import { SALT_CONFIG_OMIT, SCHEMA } from './constants.mjs';
import { hash } from './hash.mjs';
import { loadManifest, saveManifest } from './manifest.mjs';

export { hashDirectory } from './hash.mjs';

const incrementalLogger = logger.child('incremental');

/**
 * Normalizes an output path
 *
 * @param {string} path
 * @returns {string}
 */
const normalizePath = path =>
  posix.normalize(path.replaceAll('\\', '/')).replace(/^\/+/, '');

/**
 * The section a generator gets when incremental building is off
 *
 * @type {import('./types').IncrementalSection}
 */
export const DISABLED_SECTION = Object.freeze({
  /** @returns {void} */
  record: () => {},
  /** @returns {Promise<void>} */
  salt: async () => {},
  /** @returns {{ fresh: [], stale: Array<unknown> }} */
  partition: items => ({ fresh: [], stale: items }),
  /** @returns {Promise<void>} */
  prune: async () => {},
});

/**
 * Creates one generator's view of a manifest
 *
 * @param {import('./types').IncrementalGenerator} generator
 * @param {Record<string, unknown>} config - The generator's configuration
 * @param {string} output - The absolute output directory
 * @param {import('./types').ManifestSection | undefined} previous
 * @returns {import('./types').IncrementalSection & { toJSON(): import('./types').ManifestSection }}
 */
const createSection = (generator, config, output, previous) => {
  const { name, incremental: options = {} } = generator;
  const previousOutputs = previous?.outputs ?? {};

  /** @type {Map<string, Set<string>>} Files by the key of the item they belong to */
  const outputs = new Map();

  /** @type {WeakMap<object, string>} The keys `partition` derived */
  const keys = new WeakMap();

  let salt;
  let upToDate = 0;

  /**
   * @param {Array<string | Uint8Array>} [parts] - Computed at run time
   * @returns {string}
   */
  const computeSalt = (parts = []) =>
    (salt = hash(
      JSON.stringify(
        omitKeys(config, [...SALT_CONFIG_OMIT, ...(options.omit ?? [])])
      ),
      ...(options.salt ?? []),
      ...parts
    ));

  /**
   * @param {unknown} item
   * @param {((item: unknown) => import('./types').KeyParts) | undefined} key
   * @returns {string}
   */
  const keyOf = (item, key = options.key) => {
    const cacheable = typeof item === 'object' && item !== null;

    if (cacheable && keys.has(item)) {
      return keys.get(item);
    }

    salt ??= computeSalt();

    const derived = hash(
      salt,
      ...enforceArray(key ? key(item) : JSON.stringify(item))
    );

    if (cacheable) {
      keys.set(item, derived);
    }

    return derived;
  };

  /**
   * @param {unknown} item - What the files were made from, or a label
   * @param {...string} files - Relative to the output directory
   */
  const record = (item, ...files) => {
    const key = keyOf(item);
    const recorded = outputs.get(key) ?? new Set();

    for (const file of files) {
      recorded.add(normalizePath(file));
    }

    outputs.set(key, recorded);
  };

  return {
    record,

    /**
     * Adds run-time parts to the salt; call before any key is derived
     *
     * @param {() => Array<string | Uint8Array> | Promise<Array<string | Uint8Array>>} [compute]
     */
    async salt(compute) {
      if (salt !== undefined) {
        throw new Error(`"${name}" salted after its keys were derived`);
      }

      computeSalt(await compute?.());
    },

    /**
     * Splits the items by whether the previous build made their files from
     * the same key, carrying the files of those over and recording the
     * others' from `files`
     *
     * @template T
     * @param {Array<T>} items
     * @param {object} [options]
     * @param {(item: T) => import('./types').KeyParts} [options.key]
     * @param {(item: T) => string | Array<string>} [options.files]
     * @returns {{ fresh: Array<T>, stale: Array<T> }}
     */
    partition(items, { key, files } = {}) {
      const fresh = [];
      const stale = [];

      for (const item of items) {
        const previous = previousOutputs[keyOf(item, key)] ?? [];

        if (
          previous.length > 0 &&
          previous.every(file => existsSync(join(output, file)))
        ) {
          record(item, ...previous);
          fresh.push(item);
        } else {
          if (files) {
            record(item, ...enforceArray(files(item)));
          }

          stale.push(item);
        }
      }

      upToDate += fresh.length;

      return { fresh, stale };
    },

    /**
     * Deletes the previous build's files this build did not record
     */
    async prune() {
      const recorded = new Set(
        [...outputs.values()].flatMap(files => [...files])
      );
      const removed = Object.values(previousOutputs)
        .flat()
        .filter(file => !recorded.has(file));

      await Promise.all(
        removed.map(file => rm(join(output, file), { force: true }))
      );

      // Directories the removals emptied go too
      for (const file of removed) {
        for (
          let directory = posix.dirname(file);
          directory !== '.';
          directory = posix.dirname(directory)
        ) {
          try {
            await rmdir(join(output, directory));
          } catch {
            break;
          }
        }
      }

      incrementalLogger.info(
        `Kept ${upToDate} of ${outputs.size} entries, removed ${removed.length} files`,
        { generator: name }
      );
    },

    /**
     * @returns {import('./types').ManifestSection}
     */
    toJSON() {
      return {
        outputs: Object.fromEntries(
          [...outputs.keys()]
            .sort()
            .map(key => [key, [...outputs.get(key)].sort()])
        ),
      };
    },
  };
};

/**
 * Creates the store of a run's manifests, one per output directory
 *
 * @param {{ enabled: boolean }} options
 * @returns {import('./types').IncrementalStore}
 */
export const createIncrementalStore = ({ enabled }) => {
  /**
   * @type {Map<string, Promise<{ previous: import('./types').Manifest, sections: Map<string, ReturnType<typeof createSection>> }>>}
   */
  const directories = new Map();

  /**
   * @param {string} output - The absolute output directory
   */
  const open = output => {
    if (!directories.has(output)) {
      directories.set(
        output,
        loadManifest(output).then(({ manifest, reason }) => {
          if (reason) {
            incrementalLogger.info(`${reason}; building everything`);
          }

          return { previous: manifest, sections: new Map() };
        })
      );
    }

    return directories.get(output);
  };

  return {
    /**
     * @param {import('./types').IncrementalGenerator} generator
     * @param {Record<string, unknown> | undefined} config - The generator's configuration
     * @returns {Promise<import('./types').IncrementalSection>}
     */
    async section(generator, config) {
      if (!enabled || !config?.output) {
        return DISABLED_SECTION;
      }

      const { name } = generator;
      const directory = resolve(config.output);
      const { previous, sections } = await open(directory);

      if (!sections.has(name)) {
        sections.set(
          name,
          createSection(generator, config, directory, previous.generators[name])
        );
      }

      return sections.get(name);
    },

    /**
     * Writes every manifest
     */
    async save() {
      if (!enabled) {
        return;
      }

      for (const [directory, state] of directories) {
        const { previous, sections } = await state;
        const generators = { ...previous.generators };

        for (const [name, section] of sections) {
          generators[name] = section.toJSON();
        }

        await saveManifest(directory, { schema: SCHEMA, generators });

        incrementalLogger.debug(`Saved manifest`, {
          output: directory,
          generators: Object.keys(generators),
        });
      }
    },
  };
};
