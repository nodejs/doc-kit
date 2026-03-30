'use strict';

import logger from './logger/index.mjs';
import { isAsyncGenerator, createStreamingCache } from './streaming.mjs';
import createWorkerPool from './threading/index.mjs';
import createParallelWorker from './threading/parallel.mjs';

const generatorsLogger = logger.child('generators');

/**
 * Creates a generator orchestration system that manages the execution of
 * documentation generators in dependency order, with support for parallel
 * processing and streaming results.
 *
 * @param {Map<string, object>} loadedGenerators - Map of specifier → loaded generator
 */
const createGenerator = loadedGenerators => {
  /** @type {{ [key: string]: Promise<unknown> | AsyncGenerator }} */
  const cachedGenerators = {};

  const streamingCache = createStreamingCache();

  /** @type {import('piscina').Piscina} */
  let pool;

  /**
   * Gets the collected input from a dependency generator.
   *
   * @param {string | undefined} dependsOn - Dependency generator specifier
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
   * @param {string} specifier - Generator specifier to schedule
   * @param {object} configuration - Runtime options
   */
  const scheduleGenerator = async (specifier, configuration) => {
    if (specifier in cachedGenerators) {
      return;
    }

    const generator = loadedGenerators.get(specifier);
    const { dependsOn, generate, processChunk, name } = generator;

    // Schedule dependency first
    if (dependsOn && !(dependsOn in cachedGenerators)) {
      await scheduleGenerator(dependsOn, configuration);
    }

    generatorsLogger.debug(`Scheduling "${name}"`, {
      dependsOn: dependsOn || 'none',
      streaming: !!processChunk,
    });

    // Schedule the generator
    cachedGenerators[specifier] = (async () => {
      const dependencyInput = await getDependencyInput(dependsOn);

      generatorsLogger.debug(`Starting "${name}"`);

      // Create parallel worker for streaming generators
      const worker = processChunk
        ? createParallelWorker(specifier, generator, pool, configuration)
        : Promise.resolve(null);

      const result = await generate(dependencyInput, await worker);

      // For streaming generators, "Completed" is logged when collection finishes
      // (in streamingCache.getOrCollect), not here when the generator returns
      if (!isAsyncGenerator(result)) {
        generatorsLogger.debug(`Completed "${name}"`);
      }

      return result;
    })();
  };

  /**
   * Runs all requested generators with their dependencies.
   *
   * @param {object} configuration - Runtime options
   * @param {string[]} targetSpecifiers - Resolved target specifiers
   * @returns {Promise<unknown[]>} Results of all requested generators
   */
  const runGenerators = async (configuration, targetSpecifiers) => {
    const { threads } = configuration;

    generatorsLogger.debug(`Starting pipeline`, {
      generators: targetSpecifiers
        .map(s => loadedGenerators.get(s).name)
        .join(', '),
      threads,
    });

    // Create worker pool
    pool = createWorkerPool(threads);

    // Schedule all generators
    for (const specifier of targetSpecifiers) {
      await scheduleGenerator(specifier, configuration);
    }

    // Start all collections in parallel (don't await sequentially)
    const resultPromises = targetSpecifiers.map(async specifier => {
      let result = await cachedGenerators[specifier];

      if (isAsyncGenerator(result)) {
        result = await streamingCache.getOrCollect(specifier, result);
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
