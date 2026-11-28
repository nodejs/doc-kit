'use strict';

import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { join, posix } from 'node:path';
import { deserialize, serialize } from 'node:v8';

import logger from '#logger/index.mjs';
import { enforceArray } from '#utils/array.mjs';
import { createChannel } from '#utils/channel.mjs';
import { isAsyncIterable, omitKeys } from '#utils/misc.mjs';

import { SALT_CONFIG_OMIT, STATE_DIRECTORY } from './constants.mjs';
import { hash, trace } from './hash.mjs';

const incrementalLogger = logger.child('incremental');

/**
 * The section used when incremental building is off: every item is stale, and
 * nothing is stored or removed.
 *
 * @type {import('./types').IncrementalSection}
 */
export const DISABLED_SECTION = Object.freeze({
  /** @returns {AsyncIterable<Array<unknown>>} */
  reuse: (items, make) => make(items),
  /** @returns {{ fresh: [], stale: Array<unknown> }} */
  partition: items => ({ fresh: [], stale: items }),
  /** @returns {void} */
  record: () => {},
  /** @returns {Promise<void>} */
  salt: async () => {},
  /** @returns {string} */
  digest: () => '',
});

/**
 * Converts an output path to the form the manifest uses: POSIX, relative.
 *
 * @param {string} path
 * @returns {string}
 */
const normalizePath = path =>
  posix.normalize(path.replaceAll('\\', '/')).replace(/^\/+/, '');

/**
 * Finds the keys whose files all still exist.
 *
 * @param {string} output - The absolute output directory
 * @param {import('./types').Outputs} outputs
 * @returns {Promise<Set<string>>}
 */
const findIntact = async (output, outputs) => {
  const intact = new Set();

  await Promise.all(
    Object.entries(outputs).map(async ([key, files]) => {
      const stats = await Promise.all(
        files.map(file => stat(join(output, file)).catch(() => undefined))
      );

      if (stats.every(entry => entry?.isFile())) {
        intact.add(key);
      }
    })
  );

  return intact;
};

/**
 * Removes files, then any directories left empty.
 *
 * @param {string} output - The absolute output directory
 * @param {Iterable<string>} files - Relative to the output directory
 */
const removeFiles = async (output, files) => {
  await Promise.all(
    Array.from(files, file => rm(join(output, file), { force: true }))
  );

  for (const file of files) {
    for (
      let directory = posix.dirname(file);
      directory !== '.';
      directory = posix.dirname(directory)
    ) {
      try {
        await rmdir(join(output, directory));
      } catch {
        // Not empty, or already removed
        break;
      }
    }
  }
};

/**
 * Creates a generator's section of the incremental state.
 *
 * Results are stored in the generator's own directory, one file per key,
 * written to a temporary name and then renamed. A stored result is therefore
 * always complete, even after an interrupted build. Output files are written
 * in place, so they are only trusted when the manifest says the build
 * finished.
 *
 * @param {import('./types').IncrementalGenerator} generator
 * @param {Record<string, unknown>} config - The generator's configuration
 * @param {string} output - The absolute output directory
 * @param {import('./types').Outputs} [previous] - What the previous build recorded
 * @returns {Promise<{ section: import('./types').IncrementalSection, close(): Promise<import('./types').Outputs> }>}
 */
export const createSection = async (
  generator,
  config,
  output,
  previous = {}
) => {
  const { name, incremental: options = {} } = generator;

  const resultsDirectory = join(output, STATE_DIRECTORY, name);

  // Read once, up front, so checking an item never touches the disk
  const [intact, storedBefore] = await Promise.all([
    findIntact(output, previous),
    readdir(resultsDirectory).then(
      files => new Set(files),
      () => new Set()
    ),
  ]);

  /** @type {Map<string, Array<string>>} The files this build recorded, by key */
  const outputs = new Map();

  /** @type {Set<string>} Keys of the results this build uses */
  const used = new Set();

  /** @type {Set<string>} Keys of the results this build wrote */
  const written = new Set();

  let salt;
  let directory;
  let reused = 0;
  let total = 0;

  /**
   * @param {Array<import('./types').KeyPart>} [parts] - Computed at run time
   * @returns {string}
   */
  const seal = (parts = []) =>
    (salt = hash(
      name,
      omitKeys(config, [...SALT_CONFIG_OMIT, ...(options.omit ?? [])]),
      ...(options.salt ?? []),
      ...parts
    ));

  /**
   * @param {unknown} item
   * @param {import('./types').KeyOptions<unknown>['key']} key
   * @returns {string}
   */
  const keyOf = (item, key = options.key) =>
    hash((salt ??= seal()), ...enforceArray(key ? key(item) : item));

  /**
   * Counts an item for the summary.
   *
   * @param {boolean} fresh
   * @returns {boolean} `fresh`
   */
  const count = fresh => {
    total++;

    if (fresh) {
      reused++;
    }

    return fresh;
  };

  /**
   * Stores a result under its key, unless this build already has.
   *
   * @param {string} key
   * @param {unknown} result
   */
  const store = async (key, result) => {
    if (written.has(key)) {
      return;
    }

    written.add(key);

    const file = join(resultsDirectory, key);

    await (directory ??= mkdir(resultsDirectory, { recursive: true }));
    await writeFile(`${file}.tmp`, serialize(result));
    await rename(`${file}.tmp`, file);
  };

  /**
   * Loads the result stored under a key.
   *
   * @param {string} key
   * @returns {Promise<unknown>}
   */
  const load = async key => {
    const file = join(resultsDirectory, key);

    try {
      return deserialize(await readFile(file));
    } catch (cause) {
      throw new Error(`Cannot read ${file}; delete it and build again`, {
        cause,
      });
    }
  };

  /** @type {import('./types').IncrementalSection} */
  const section = {
    /** @type {import('./types').IncrementalSection['reuse']} */
    async *reuse(items, make, { key, file, read } = {}) {
      /**
       * One slot per item, in input order, until its result is yielded.
       * `path` is set when the result is read from the generator's own file.
       *
       * @type {Array<{ key: string, path?: string, result?: unknown }>}
       */
      const slots = [];

      // Slots waiting for a result from `make`, in order
      const making = [];

      // Runs of leading slots whose results are ready to yield
      const ready = createChannel();

      /**
       * Queues every slot ahead of the first one still waiting.
       */
      const flush = () => {
        const waiting = slots.indexOf(making[0]);
        const run = slots.splice(0, waiting === -1 ? slots.length : waiting);

        if (run.length > 0) {
          ready.push(run);
        }
      };

      /**
       * Creates a slot for each item, and yields the stale items.
       *
       * @yields {Array<unknown>} Each batch's stale items
       */
      async function* staleItems() {
        for await (const batch of isAsyncIterable(items) ? items : [items]) {
          const stale = [];

          for (const item of batch) {
            const slot = { key: keyOf(item, key) };

            slots.push(slot);

            if (file) {
              slot.path = normalizePath(file(item));
              outputs.set(slot.key, [slot.path]);
            } else {
              used.add(slot.key);
            }

            if (!count((file ? intact : storedBefore).has(slot.key))) {
              making.push(slot);
              stale.push(item);
            }
          }

          flush();

          if (stale.length > 0) {
            yield stale;
          }
        }
      }

      /**
       * Assigns the results from `make` to their slots.
       */
      const fill = async () => {
        try {
          for await (const results of make(staleItems())) {
            await Promise.all(
              results.map(result => {
                const slot = making.shift();

                if (!slot) {
                  throw new Error(
                    `"${name}" made more results than it was given items`
                  );
                }

                slot.result = result;

                return file ? undefined : store(slot.key, result);
              })
            );

            flush();
          }
        } finally {
          ready.end();
        }
      };

      const filling = fill();

      // Rethrown below, after the results that preceded the failure
      filling.catch(() => {});

      for await (const run of ready) {
        const results = await Promise.all(
          run.map(slot => {
            if ('result' in slot) {
              return slot.result;
            }

            return file ? read(join(output, slot.path)) : load(slot.key);
          })
        );

        for (const [index, result] of results.entries()) {
          trace(result, run[index].key);
        }

        yield results;
      }

      await filling;
    },

    /** @type {import('./types').IncrementalSection['partition']} */
    partition(items, { key, files }) {
      const fresh = [];
      const stale = [];

      for (const item of items) {
        const itemKey = keyOf(item, key);

        outputs.set(itemKey, enforceArray(files(item)).map(normalizePath));

        (count(intact.has(itemKey)) ? fresh : stale).push(item);
      }

      return { fresh, stale };
    },

    /** @type {import('./types').IncrementalSection['record']} */
    record(label, ...files) {
      outputs.set(label, files.map(normalizePath));
    },

    /** @type {import('./types').IncrementalSection['salt']} */
    async salt(compute) {
      if (salt !== undefined) {
        throw new Error(`"${name}" salted after its keys were derived`);
      }

      seal(await compute());
    },

    digest: hash,
  };

  return {
    section,

    /**
     * Removes the previous build's files and results that this build did not
     * use, and returns the files it recorded.
     *
     * @returns {Promise<import('./types').Outputs>}
     */
    async close() {
      const recorded = new Set([...outputs.values()].flat());
      const removed = new Set(Object.values(previous).flat()).difference(
        recorded
      );

      await removeFiles(output, removed);

      // Includes temporary files left by an interrupted build
      const unused = storedBefore.difference(used);

      await removeFiles(
        output,
        Array.from(unused, file => posix.join(STATE_DIRECTORY, name, file))
      );

      if (total > 0 || removed.size > 0 || unused.size > 0) {
        incrementalLogger.info(
          `Reused ${reused} of ${total} items, removed ${removed.size} files and ${unused.size} stored results`,
          { generator: name }
        );
      }

      return Object.fromEntries(outputs);
    },
  };
};
