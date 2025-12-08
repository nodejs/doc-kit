'use strict';

import { allGenerators } from './generators/index.mjs';
import logger from './logger/index.mjs';
import { isAsyncGenerator, createStreamingCache } from './streaming.mjs';
import WorkerPool from './threading/index.mjs';
import createParallelWorker from './threading/parallel.mjs';

const generatorsLogger = logger.child('generators');

/**
 * Creates a generator orchestration system that manages the execution of
 * documentation generators in dependency order, with support for parallel
 * processing and streaming results.
 *
 * Generators can output content consumed by other generators or write to files.
 * The system handles dependency resolution, parallel scheduling, and result caching.
 *
 * @typedef {{ ast: GeneratorMetadata<ParserOutput, ParserOutput>}} AstGenerator
 * @typedef {AvailableGenerators & AstGenerator} AllGenerators
 *
 * @param {ParserOutput} input - The API doc AST tree
 * @returns {{ runGenerators: (options: GeneratorOptions) => Promise<unknown> }}
 */
const createGenerator = input => {
  /**
   * Cache for generator results (Promises or AsyncGenerators).
   * @type {{ [K in keyof AllGenerators]?: ReturnType<AllGenerators[K]['generate']> }}
   */
  const cachedGenerators = { ast: Promise.resolve(input) };

  /**
   * Cache for async generator collection results.
   * Ensures collection happens only once when multiple generators depend on
   * the same streaming generator.
   */
  const streamingCache = createStreamingCache();

  /**
   * Shared WorkerPool instance for all generators.
   * @type {WorkerPool | null}
   */
  let sharedPool = null;

  /**
   * Resolves the dependency input for a generator, handling both regular
   * promises and async generators. For async generators, creates a shared
   * collection so multiple dependents reuse the same result.
   *
   * @param {string} dependsOn - Name of the dependency generator
   * @returns {Promise<unknown>} Collected results from the dependency
   */
  const getDependencyInput = async dependsOn => {
    const result = await cachedGenerators[dependsOn];

    // For async generators, collect all chunks (shared across dependents)
    if (isAsyncGenerator(result)) {
      generatorsLogger.debug(
        `Collecting async generator output from "${dependsOn}"`
      );

      return streamingCache.getOrCollect(dependsOn, result);
    }

    return result;
  };

  /**
   * Schedules generators for execution without creating new pools.
   * Uses the shared pool for all parallel work.
   *
   * @param {GeneratorOptions} options - Generator runtime options
   * @param {WorkerPool} pool - Shared worker pool
   */
  const scheduleGenerators = (options, pool) => {
    const { generators } = options;

    for (const generatorName of generators) {
      // Skip already scheduled generators
      if (generatorName in cachedGenerators) {
        generatorsLogger.debug(`Skipping "${generatorName}"`);

        continue;
      }

      const { dependsOn, generate } = allGenerators[generatorName];

      // Recursively schedule dependencies (without awaiting)
      if (dependsOn && !(dependsOn in cachedGenerators)) {
        generatorsLogger.debug(`Scheduling "${dependsOn}":"${generatorName}"`);

        scheduleGenerators({ ...options, generators: [dependsOn] }, pool);
      }

      // Create a ParallelWorker for this generator's chunk processing
      const worker = createParallelWorker(generatorName, pool, options);

      generatorsLogger.debug(`Scheduling generator "${generatorName}"`, {
        dependsOn: dependsOn || 'none',
      });

      // Schedule the generator (awaits dependency internally)
      cachedGenerators[generatorName] = (async () => {
        const dependencyInput = await getDependencyInput(dependsOn);

        generatorsLogger.debug(`Starting generator "${generatorName}"`);

        const result = await generate(dependencyInput, { ...options, worker });

        generatorsLogger.debug(`Completed generator "${generatorName}"`);

        return result;
      })();
    }
  };

  /**
   * Schedules and runs all requested generators with their dependencies.
   * Independent generators run in parallel; dependent generators wait for
   * their dependencies to complete.
   *
   * @param {GeneratorOptions} options - Generator runtime options
   * @returns {Promise<unknown>} Result of the last generator in the pipeline
   */
  const runGenerators = async options => {
    const { generators, threads } = options;

    generatorsLogger.debug(`Starting generator pipeline`, {
      generators: generators.join(', '),
      threads,
    });

    // Create shared WorkerPool for all generators (only once)
    if (!sharedPool) {
      sharedPool = new WorkerPool('./chunk-worker.mjs', threads);
    }

    // Schedule all generators using the shared pool
    scheduleGenerators(options, sharedPool);

    // Wait for the last generator's result
    const result = await cachedGenerators[generators[generators.length - 1]];

    // Terminate workers after all work is complete
    await sharedPool.terminate();

    sharedPool = null;

    return result;
  };

  return { runGenerators };
};

export default createGenerator;
