'use strict';

import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { hashData, hashValue } from './hash.mjs';
import { loadManifest, saveManifest } from './manifest.mjs';
import { aggregateKey, chainSalt } from './salt.mjs';
import { createSnapshot } from './snapshot.mjs';
import { createStore } from './store.mjs';
import { resolveGeneratorSpecifier } from '../generators/loader.mjs';
import logger from '../logger/index.mjs';
import { enforceArray } from '../utils/array.mjs';
import { loadFromURL } from '../utils/loaders.mjs';

const cacheLogger = logger.child('cache');

/** @type {import('./types').BuildCache | null} */
let context = null;

/**
 * The active build cache, or null when caching is disabled (or in a worker
 * thread, where the cache is never set up).
 *
 * @returns {import('./types').BuildCache | null}
 */
export const getBuildCache = () => context;

/**
 * Resolves the cache directory: explicit configuration, then
 * `node_modules/.cache/doc-kit` when a `node_modules` exists, falling back
 * to `.doc-kit-cache`.
 *
 * @param {string} [explicit] - Configured directory, if any
 * @returns {string} Absolute cache directory
 */
export const resolveCacheDir = explicit =>
  resolve(
    explicit ||
      (existsSync('node_modules')
        ? join('node_modules', '.cache', 'doc-kit')
        : '.doc-kit-cache')
  );

/**
 * Checks that every output recorded by a previous run is still on disk with
 * the recorded size and content hash. Any deviation disqualifies a skip —
 * rerunning the generators is always the recovery path.
 *
 * @param {import('./types').Profile} profile - Prior run's profile
 * @param {string} outputDir - The configured output directory
 * @returns {Promise<boolean>} Whether every output verifies
 */
const verifyOutputs = async (profile, outputDir) => {
  const entries = Object.entries(profile.outputs);

  if (entries.length > 0 && !outputDir) {
    return false;
  }

  const checks = await Promise.all(
    entries.map(async ([rel, record]) => {
      try {
        const path = join(outputDir, rel);

        if ((await stat(path)).size !== record.size) {
          return false;
        }

        return hashData(await readFile(path)) === record.hash;
      } catch {
        return false;
      }
    })
  );

  return checks.every(Boolean);
};

/**
 * Resolves a string `typeMap` configuration into its parsed content before
 * salts are computed, so the salt covers the fetched bytes — a typeMap change
 * must invalidate downstream even though no source file changed.
 *
 * @param {import('../utils/configuration/types').Configuration} configuration - Resolved configuration
 * @returns {Promise<void>}
 */
const resolveTypeMap = async configuration => {
  if (typeof configuration.metadata?.typeMap === 'string') {
    configuration.metadata.typeMap = JSON.parse(
      await loadFromURL(configuration.metadata.typeMap)
    );
  }
};

/**
 * Sets up the durable build cache for one run: hashes input snapshots,
 * computes every target's aggregate key, and decides whether this invocation
 * can skip entirely because its outputs are already on disk and verified —
 * in which case `{ skipped: true }` is returned and no cache is set up.
 *
 * Any failure disables the cache for the run (with a debug log) — the build
 * must never fail, or even get slower than a cold build, because of caching.
 *
 * @param {import('../utils/configuration/types').Configuration} configuration - Resolved configuration
 * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
 * @param {string[]} targets - Resolved target specifiers
 * @returns {Promise<import('./types').BuildCache | { skipped: true } | null>}
 */
export const setupBuildCache = async (configuration, generators, targets) => {
  const settings = { enabled: true, maxAgeDays: 7, ...configuration.cache };

  if (settings.enabled === false) {
    return (context = null);
  }

  try {
    const dir = resolveCacheDir(settings.dir);
    const outputDir = configuration.global?.output;
    const store = createStore(dir);
    const manifest = await loadManifest(dir);

    await resolveTypeMap(configuration);

    /** @type {Map<string, Promise<import('./types').Snapshot>>} */
    const snapshots = new Map();

    /**
     * Memoized input snapshot for a root generator's configured globs.
     *
     * @param {string} specifier - Resolved root generator specifier
     * @returns {Promise<import('./types').Snapshot>}
     */
    const snapshotFor = specifier => {
      if (!snapshots.has(specifier)) {
        const { name } = generators.get(specifier);
        const slice = configuration[name] ?? {};

        snapshots.set(
          specifier,
          createSnapshot(enforceArray(slice.input ?? []), slice.ignore)
        );
      }

      return snapshots.get(specifier);
    };

    /**
     * Resolves a generator's `dependsOn` into a resolved specifier.
     *
     * @param {string} specifier - Resolved generator specifier
     * @returns {string | undefined}
     */
    const resolveDependency = specifier => {
      const { dependsOn } = generators.get(specifier);

      return dependsOn && resolveGeneratorSpecifier(dependsOn);
    };

    /** @type {Record<string, string>} */
    const targetKeys = {};

    for (const target of targets) {
      targetKeys[target] = await aggregateKey(
        target,
        generators,
        resolveDependency,
        configuration,
        snapshotFor
      );
    }

    const profileKey = hashValue({
      targets: [...targets].sort(),
      input: configuration.global?.input,
      output: outputDir,
    });

    // Skip is all-or-nothing per invocation shape: outputs cannot be
    // attributed to individual concurrent generators, so a partial skip could
    // not verify what it skips. Per-item leaf caches make partial misses
    // cheap instead.
    const profile = manifest.profiles[profileKey];

    if (
      !settings.force &&
      profile?.complete &&
      targets.every(target => profile.targets[target] === targetKeys[target]) &&
      (await verifyOutputs(profile, outputDir))
    ) {
      cacheLogger.info(
        `All ${targets.length} target(s) up to date; outputs verified on disk`
      );

      return { skipped: true };
    }

    /** @type {Map<string, string> | null} */
    let sourceHashes = null;

    /**
     * Content hash of the source file behind a module path (the extensionless
     * `MetadataEntry.path`, e.g. `/fs`), or undefined when unknown — callers
     * must treat unknown provenance as uncacheable.
     *
     * @param {string} modulePath - Extensionless module path with leading `/`
     * @returns {Promise<string | undefined>}
     */
    const sourceHashFor = async modulePath => {
      if (!sourceHashes) {
        sourceHashes = new Map();

        for (const snapshot of await Promise.all(snapshots.values())) {
          for (const file of snapshot.files) {
            const posixRel = file.rel.split(sep).join('/');

            sourceHashes.set(
              `/${posixRel.replace(/\.[0-9a-z]+$/i, '')}`,
              file.hash
            );
          }
        }
      }

      return sourceHashes.get(modulePath);
    };

    /** @type {Map<string, import('./types').OutputRecord>} */
    const outputs = new Map();

    /**
     * Records an output file (hash + size, relative to the output directory)
     * for whole-run verification on later invocations.
     *
     * @param {string} absPath - Absolute path of the written file
     * @param {Buffer | string} content - The written content
     * @returns {void}
     */
    const recordOutput = (absPath, content) => {
      if (!outputDir) {
        return;
      }

      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

      outputs.set(relative(resolve(outputDir), resolve(absPath)), {
        hash: hashData(buffer),
        size: buffer.byteLength,
      });
    };

    context = {
      store,
      dir,
      recordOutput,
      sourceHash: sourceHashFor,

      /**
       * Chain salt for a generator, for use in per-item leaf-cache keys:
       * covers every code and configuration input in the generator's
       * dependency chain, but not the input files (leaf keys add the
       * specific file hashes they depend on).
       *
       * @param {string} specifier - Resolved generator specifier
       * @returns {string} Chain salt
       */
      chainSalt: specifier =>
        chainSalt(specifier, generators, resolveDependency, configuration).salt,

      /**
       * Tracked file write: records the output and skips byte-identical
       * writes so warm runs leave mtimes untouched.
       *
       * @param {string} file - Destination path
       * @param {unknown} data - File contents
       * @param {unknown[]} [rest] - Remaining fs.writeFile arguments
       * @returns {Promise<void>}
       */
      writeTracked: async (file, data, rest = []) => {
        if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
          // Untrackable payloads (streams, etc.) fall through untouched.
          await mkdir(dirname(file), { recursive: true });

          return writeFile(file, data, ...rest);
        }

        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

        recordOutput(file, buffer);

        // Skipping byte-identical writes keeps mtimes stable for downstream
        // tooling and makes warm rebuilds mostly write-free.
        const existing = await readFile(file).catch(() => null);

        if (existing?.equals(buffer)) {
          return;
        }

        await mkdir(dirname(file), { recursive: true });

        return writeFile(file, buffer);
      },

      /**
       * Flushes pending object writes, persists the run's profile (only on
       * success), and prunes stale objects.
       *
       * @param {boolean} success - Whether the run completed without error
       * @returns {Promise<void>}
       */
      finalize: async success => {
        await store.flush().catch(() => undefined);

        try {
          if (success) {
            await saveManifest(dir, {
              [profileKey]: {
                completedAt: Date.now(),
                targets: targetKeys,
                outputs: Object.fromEntries(outputs),
                complete: true,
              },
            });

            await store.prune(settings.maxAgeDays);
          }
        } catch (error) {
          cacheLogger.debug('Failed to persist cache manifest', {
            error: error.message,
          });
        }

        context = null;
      },
    };

    return context;
  } catch (error) {
    cacheLogger.debug(`Cache disabled for this run: ${error.message}`);

    return (context = null);
  }
};
