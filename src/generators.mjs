'use strict';

import { createCache } from './caching.mjs';
import { allGenerators } from './generators/index.mjs';
import logger from './logger/index.mjs';
import createWorkerPool from './threading/index.mjs';
import createParallelWorker from './threading/parallel.mjs';
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
   * Gets the collected input from a dependency generator.
   *
   * @param {string | undefined} dependsOn - Dependency generator name
   * @returns {Promise<unknown>}
   */
  const getDependencyInput = async dependsOn => {
    if (!dependsOn) {
      return undefined;
    }

    return cache.consume(dependsOn);
  };

  /**
   * Schedules a generator and its dependencies for execution.
   *
   * @param {string} generatorName - Generator to schedule
   * @param {import('./utils/configuration/types').Configuration} configuration - Runtime options
   */
  const scheduleGenerator = async (generatorName, configuration) => {
    if (cache.has(generatorName)) {
      return;
    }

    const { dependsOn, generate, hasParallelProcessor } =
      allGenerators[generatorName];

    // Schedule dependency first
    if (dependsOn && !cache.has(dependsOn)) {
      await scheduleGenerator(dependsOn, configuration);
    }

    generatorsLogger.debug(`Scheduling "${generatorName}"`, {
      dependsOn: dependsOn || 'none',
      streaming: hasParallelProcessor,
    });

    // Schedule the generator
    cache.store(
      generatorName,
      (async () => {
        const dependencyInput = await getDependencyInput(dependsOn);

        generatorsLogger.debug(`Starting "${generatorName}"`);

        // Create parallel worker for streaming generators
        const worker = hasParallelProcessor
          ? createParallelWorker(generatorName, pool, configuration)
          : Promise.resolve(null);

        const result = await generate(dependencyInput, await worker, {
          target: configuration.target,
        });

        // For streaming generators, "Completed" is logged when the cache
        // finishes collecting, not here when the generator returns
        if (!isAsyncIterable(result)) {
          generatorsLogger.debug(`Completed "${generatorName}"`);
        }

        return result;
      })()
    );
  };

  /**
   * Runs all requested generators with their dependencies.
   *
   * @param {import('./utils/configuration/types').Configuration} options - Runtime options
   * @returns {Promise<unknown[]>} Results of all requested generators
   */
  const runGenerators = async configuration => {
    const { target: generators, threads } = configuration;

    generatorsLogger.debug(`Starting pipeline`, {
      generators: generators.join(', '),
      threads,
    });

    // Compute consumer counts up front so dependencies can be evicted as soon
    // as their last consumer runs (must be ready before any generator starts).
    cache.populateConsumerCounts(
      generators,
      name => allGenerators[name].dependsOn
    );

    // Create worker pool
    pool = createWorkerPool(threads);

    // Schedule all generators
    for (const name of generators) {
      await scheduleGenerator(name, configuration);
    }

    // Start all collections in parallel (don't await sequentially). Consuming
    // through the shared path lets the final read also trigger eviction.
    const results = await Promise.all(
      generators.map(name => cache.consume(name))
    );

    await pool.destroy();

    return results;
  };

  return { runGenerators };
};

export default createGenerator;
