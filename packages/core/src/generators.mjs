'use strict';

import { createCache } from './caching.mjs';
import {
  loadGenerators,
  resolveGeneratorSpecifier,
} from './generators/loader.mjs';
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
   * @param {string | undefined} dependsOn - Resolved dependency specifier
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
   * @param {string} specifier - Resolved generator specifier to schedule
   * @param {Map<string, GeneratorMetadata>} generators - Loaded generators
   * @param {import('./utils/configuration/types').Configuration} configuration - Runtime options
   */
  const scheduleGenerator = (specifier, generators, configuration) => {
    if (cache.has(specifier)) {
      return;
    }

    const generator = generators.get(specifier);
    const { name, generate, hasParallelProcessor } = generator;

    const dependsOn =
      generator.dependsOn && resolveGeneratorSpecifier(generator.dependsOn);

    // Schedule dependency first
    if (dependsOn && !cache.has(dependsOn)) {
      scheduleGenerator(dependsOn, generators, configuration);
    }

    generatorsLogger.debug(`Scheduling "${name}"`, {
      dependsOn: dependsOn || 'none',
      streaming: hasParallelProcessor,
    });

    // Schedule the generator
    cache.store(
      specifier,
      (async () => {
        const dependencyInput = await getDependencyInput(dependsOn);

        generatorsLogger.debug(`Starting "${name}"`);

        // Create parallel worker for streaming generators
        const worker = hasParallelProcessor
          ? createParallelWorker(specifier, generator, pool, configuration)
          : Promise.resolve(null);

        const result = await generate(dependencyInput, await worker);

        // For streaming generators, "Completed" is logged when the cache
        // finishes collecting, not here when the generator returns
        if (!isAsyncIterable(result)) {
          generatorsLogger.debug(`Completed "${name}"`);
        }

        return result;
      })()
    );
  };

  /**
   * Runs all requested generators with their dependencies.
   *
   * @param {import('./utils/configuration/types').Configuration} configuration - Runtime options
   * @returns {Promise<unknown[]>} Results of all requested generators
   */
  const runGenerators = async configuration => {
    const { target, threads } = configuration;

    // Resolve shorthand names and load the full dependency closure up front,
    // so scheduling below is fully synchronous.
    const targets = target.map(resolveGeneratorSpecifier);
    const generators = await loadGenerators(targets);

    generatorsLogger.debug(`Starting pipeline`, {
      generators: targets.join(', '),
      threads,
    });

    // Compute consumer counts up front so dependencies can be evicted as soon
    // as their last consumer runs (must be ready before any generator starts).
    cache.populateConsumerCounts(targets, specifier => {
      const { dependsOn } = generators.get(specifier);

      return dependsOn && resolveGeneratorSpecifier(dependsOn);
    });

    // Create worker pool
    pool = createWorkerPool(threads);

    // Schedule all generators
    for (const specifier of targets) {
      scheduleGenerator(specifier, generators, configuration);
    }

    // Start all collections in parallel (don't await sequentially). Consuming
    // through the shared path lets the final read also trigger eviction.
    const results = await Promise.all(
      targets.map(specifier => cache.consume(specifier))
    );

    await pool.destroy();

    return results;
  };

  return { runGenerators };
};

export default createGenerator;
