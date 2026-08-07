'use strict';

import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { combine } from './hash.mjs';
import logger from '../logger/index.mjs';

const storeLogger = logger.child('cache');

/**
 * Content-addressed object store. The filename IS the fully-salted input key,
 * so objects are self-validating: lookup is existence, corruption is a miss.
 * Writes are temp-file-then-rename — atomic, and idempotent under concurrent
 * processes computing the same key.
 *
 * @param {string} dir - Cache directory
 * @returns {import('./types').Store}
 */
export const createStore = dir => {
  const objectsDir = join(dir, 'objects');
  const tmpDir = join(dir, 'tmp');

  /** @type {Set<Promise<void>>} */
  const pending = new Set();

  /**
   * @param {string} key - Object key
   * @returns {string} Object path, sharded to keep directories small
   */
  const pathFor = key => join(objectsDir, key.slice(0, 2), key);

  /**
   * Reads an object; any failure is a miss.
   *
   * @param {string} key - Object key
   * @returns {Promise<string | null>} Stored value, or null
   */
  const get = key => readFile(pathFor(key), 'utf-8').catch(() => null);

  /**
   * Persists an object write-behind: failures are logged and swallowed —
   * the build must never fail because the cache did.
   *
   * @param {string} key - Object key
   * @param {string} value - Value to store
   * @returns {void}
   */
  const put = (key, value) => {
    const write = (async () => {
      const tmp = join(tmpDir, randomUUID());

      await mkdir(dirname(pathFor(key)), { recursive: true });
      await mkdir(tmpDir, { recursive: true });
      await writeFile(tmp, value);
      await rename(tmp, pathFor(key));
    })().catch(error =>
      storeLogger.debug(`Cache write failed for ${key}`, {
        error: error.message,
      })
    );

    pending.add(write);
    write.finally(() => pending.delete(write));
  };

  return {
    get,
    put,

    /**
     * Checks that an object exists without reading it, refreshing its mtime
     * so a concurrent age-based prune cannot delete an object another run
     * just decided to rely on.
     *
     * @param {string} key - Object key
     * @returns {Promise<boolean>} Whether the object exists
     */
    touch: async key => {
      try {
        const now = new Date();

        await utimes(pathFor(key), now, now);

        return true;
      } catch {
        return false;
      }
    },

    /**
     * Durable memo: returns the cached value for `(namespace, key)` or runs
     * `produce`, persists, and returns its result.
     *
     * @param {string} namespace - Distinguishes value kinds sharing key inputs
     * @param {string} key - Input key
     * @param {() => Promise<string> | string} produce - Computes the value on miss
     * @returns {Promise<string>} The cached or computed value
     */
    memo: async (namespace, key, produce) => {
      const derived = combine(namespace, key);
      const cached = await get(derived);

      if (cached !== null) {
        return cached;
      }

      const value = await produce();

      put(derived, value);

      return value;
    },

    /**
     * Awaits all in-flight writes.
     *
     * @returns {Promise<void>}
     */
    flush: () => Promise.all([...pending]).then(() => undefined),

    /**
     * Deletes objects older than the given age. Deleting a live object only
     * causes a future miss, so pruning needs no reference tracking.
     *
     * @param {number} maxAgeDays - Age threshold in days
     * @returns {Promise<void>}
     */
    prune: async maxAgeDays => {
      const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

      const entries = await readdir(objectsDir, {
        recursive: true,
        withFileTypes: true,
      }).catch(() => []);

      await Promise.all(
        entries
          .filter(entry => entry.isFile())
          .map(async entry => {
            const path = join(entry.parentPath, entry.name);

            try {
              if ((await stat(path)).mtimeMs < cutoff) {
                await rm(path, { force: true });
              }
            } catch {
              // A concurrent process may have pruned it already.
            }
          })
      );
    },
  };
};
