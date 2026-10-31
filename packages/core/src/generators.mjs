'use strict';

import { createCache } from './caching.mjs';
import {
  loadGenerators,
  resolveGeneratorSpecifier,
} from './generators/loader.mjs';
import { resolvePipeline } from './generators/pipeline.mjs';
import logger from './logger/index.mjs';
import createWorkerPool from './threading/index.mjs';
import createParallelWorker from './threading/parallel.mjs';
import { loadMarkdownPlugins } from './utils/markdown/plugins.mjs';
import { isAsyncIterable } from './utils/misc.mjs';

const generatorsLogger = logger.child('generators');

/**
 * Creates a generator orchestration system that manages the execution of
 * documentation generators in dependency order, with support for parallel
 * processing and streaming results.
 */
const createGenerator = () => {
  // Owns all caching: generator results, stream collection, and the
  // consumer-count bookkeeping that drives eviction.
  const cache = createCache();

  /** @type {import('piscina').Piscina} */
  let pool;

  /**
   * Gets the input from a dependency generator: collected, or its chunks as the
   * dependency yields them.
   *
   * @param {string | undefined} dependsOn - Resolved dependency specifier
   * @param {boolean} [streamed] - Whether to give its chunks as they are yielded
   * rather than collected
   * @returns {Promise<unknown>}
   */
  const getDependencyInput = async (dependsOn, streamed) => {
    if (!dependsOn) {
      return undefined;
    }

    return streamed ? cache.stream(dependsOn) : cache.consume(dependsOn);
  };

  /**
   * Schedules a generator and its dependencies for execution.
   *
   * @param {string} specifier - Resolved generator specifier to schedule
   * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
   * @param {Map<string, string | undefined>} inputOf - Each generator's
   * effective input generator (its dependency, unless another generator was
   * spliced in front of it via `dependent`)
   * @param {import('./utils/configuration/types').Configuration} configuration - Runtime options
   */
  const scheduleGenerator = (specifier, generators, inputOf, configuration) => {
    if (cache.has(specifier)) {
      return;
    }

    const generator = generators.get(specifier);
    const { name, generate, hasParallelProcessor, streamsInput } = generator;

    const dependsOn = inputOf.get(specifier);

    // Schedule dependency first
    if (dependsOn && !cache.has(dependsOn)) {
      scheduleGenerator(dependsOn, generators, inputOf, configuration);
    }

    generatorsLogger.debug(`Scheduling "${name}"`, {
      dependsOn: dependsOn || 'none',
      streaming: hasParallelProcessor,
    });

    // Schedule the generator
    cache.store(
      specifier,
      (async () => {
        // With one thread nothing runs alongside, so streaming would only keep
        // every stage's data alive at once: each stage takes its input whole
        const dependencyInput = await getDependencyInput(
          dependsOn,
          streamsInput && configuration.threads > 1
        );

        generatorsLogger.debug(`Starting "${name}"`);

        // Load its Markdown pipeline, for what it processes on this thread
        await loadMarkdownPlugins(generator, configuration[name]?.markdown);

        // Create parallel worker for streaming generators
        const worker = hasParallelProcessor
          ? createParallelWorker(specifier, generator, pool, configuration)
          : Promise.resolve(null);

        // Returned rather than awaited, so this function doesn't hold on to the
        // input while the generator runs, and the generator can let it go
        return generate(dependencyInput, await worker);
      })().then(result => {
        // For streaming generators, the cache logs each chunk as it records
        // it, not here when the generator returns
        if (!isAsyncIterable(result)) {
          generatorsLogger.debug(`Completed "${name}"`);
        }

        return result;
      })
    );
  };

  /**
   * Runs all requested generators with their dependencies.
   *
   * @param {import('./utils/configuration/types').Configuration} configuration - Runtime options
   * @param {{ results?: boolean }} [options] - With `results: false`, none of
   * the requested generators' results is kept, so each can be let go as soon
   * as it is produced
   * @returns {Promise<unknown[] | undefined>} Results of all requested
   * generators, or `undefined` with `results: false`
   */
  const runGenerators = async (configuration, { results = true } = {}) => {
    const { target, threads } = configuration;

    // Resolve shorthand names and load the full dependency closure up front,
    // so scheduling below is fully synchronous.
    const generators = await loadGenerators(
      target.map(resolveGeneratorSpecifier)
    );

    // Work out who reads from whom once generators declaring a `dependent`
    // have been spliced in, and which generators the run finally collects.
    const { targets, inputOf } = resolvePipeline(
      target.map(resolveGeneratorSpecifier),
      generators
    );

    generatorsLogger.debug(`Starting pipeline`, {
      generators: targets.join(', '),
      threads,
    });

    // Compute consumer counts up front so dependencies can be evicted as soon
    // as their last consumer runs (must be ready before any generator starts).
    cache.populateConsumerCounts(targets, specifier => inputOf.get(specifier));

    // Create worker pool
    pool = createWorkerPool(threads);

    // Schedule all generators
    for (const specifier of targets) {
      scheduleGenerator(specifier, generators, inputOf, configuration);
    }

    // Start all reads in parallel (don't await sequentially). Reading through
    // the shared path lets the final read also trigger eviction.
    const read = results ? cache.consume : cache.drain;
    const collected = await Promise.all(targets.map(read));

    await pool.destroy();

    return results ? collected : undefined;
  };

  return { runGenerators };
};

export default createGenerator;
