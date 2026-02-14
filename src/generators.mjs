'use strict';

import { allGenerators } from './generators/index.mjs';
import logger from './logger/index.mjs';
import { isAsyncGenerator, createStreamingCache } from './streaming.mjs';
import createWorkerPool from './threading/index.mjs';
import createParallelWorker from './threading/parallel.mjs';

const generatorsLogger = logger.child('generators');

/**
 * Creates a generator orchestration system that manages the execution of
 * documentation generators in dependency order, with support for parallel
 * processing and streaming results.
 */
const createGenerator = () => {
  /** @type {{ [key: string]: Promise<unknown> | AsyncGenerator }} */
  const cachedGenerators = {};

  const streamingCache = createStreamingCache();

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

    const result = await cachedGenerators[dependsOn];

    if (isAsyncGenerator(result)) {
      return streamingCache.getOrCollect(dependsOn, result);
    }

    return result;
  };

  /**
   * Schedules a generator and its dependencies for execution.
   *
   * @param {string} generatorName - Generator to schedule
   * @param {import('./utils/configuration/types').Configuration} configuration - Runtime options
   */
  const scheduleGenerator = (generatorName, configuration) => {
    if (generatorName in cachedGenerators) {
      return;
    }

    const { dependsOn, generate, processChunk } = allGenerators[generatorName];

    // Schedule dependency first
    if (dependsOn && !(dependsOn in cachedGenerators)) {
      scheduleGenerator(dependsOn, configuration);
    }

    generatorsLogger.debug(`Scheduling "${generatorName}"`, {
      dependsOn: dependsOn || 'none',
      streaming: Boolean(processChunk),
    });

    // Schedule the generator
    cachedGenerators[generatorName] = (async () => {
      const dependencyInput = await getDependencyInput(dependsOn);

      generatorsLogger.debug(`Starting "${generatorName}"`);

      // Create parallel worker for streaming generators
      const worker = processChunk
        ? createParallelWorker(generatorName, pool, configuration)
        : null;

      const result = await generate(dependencyInput, worker);

      // For streaming generators, "Completed" is logged when collection finishes
      // (in streamingCache.getOrCollect), not here when the generator returns
      if (!isAsyncGenerator(result)) {
        generatorsLogger.debug(`Completed "${generatorName}"`);
      }

      return result;
    })();
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

    // Create worker pool
    pool = createWorkerPool(threads);

    // Schedule all generators
    for (const name of generators) {
      scheduleGenerator(name, configuration);
    }

    // Start all collections in parallel (don't await sequentially)
    const resultPromises = generators.map(async name => {
      let result = await cachedGenerators[name];

      if (isAsyncGenerator(result)) {
        result = await streamingCache.getOrCollect(name, result);
      }

      return result;
    });

    const results = await Promise.all(resultPromises);

    await pool.destroy();

    return results;
  };

  return { runGenerators };
};

export default createGenerator;
