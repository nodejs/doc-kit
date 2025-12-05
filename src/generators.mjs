'use strict';

import { allGenerators } from './generators/index.mjs';
import WorkerPool from './threading/index.mjs';
import createParallelWorker from './threading/parallel.mjs';

/**
 * This method creates a system that allows you to register generators
 * and then execute them in a specific order, keeping track of the
 * generation process, and handling errors that may occur from the
 * execution of generating content.
 *
 * When the final generator is reached, the system will return the
 * final generated content.
 *
 * Generators can output content that can be consumed by other generators;
 * Generators can also write to files. These would usually be considered
 * the final generators in the chain.
 *
 * @typedef {{ ast: GeneratorMetadata<ParserOutput, ParserOutput>}} AstGenerator The AST "generator" is a facade for the AST tree and it isn't really a generator
 * @typedef {AvailableGenerators & AstGenerator} AllGenerators A complete set of the available generators, including the AST one
 *
 * @param {ParserOutput} input The API doc AST tree
 */
const createGenerator = input => {
  /**
   * We store all the registered generators to be processed
   * within a Record, so we can access their results at any time whenever needed
   * (we store the Promises of the generator outputs)
   *
   * @type {{ [K in keyof AllGenerators]: ReturnType<AllGenerators[K]['generate']> }}
   */
  const cachedGenerators = { ast: Promise.resolve(input) };

  /**
   * Runs the Generator engine with the provided top-level input and the given generator options
   *
   * @param {GeneratorOptions} options The options for the generator runtime
   */
  const runGenerators = async options => {
    const { generators, threads } = options;

    // WorkerPool for chunk-level parallelization within generators
    const chunkPool = new WorkerPool('./chunk-worker.mjs', threads);

    // Schedule all generators, allowing independent ones to run in parallel.
    // Each generator awaits its own dependency internally, so generators
    // with the same dependency (e.g. legacy-html and legacy-json both depend
    // on metadata) will run concurrently once metadata resolves.
    for (const generatorName of generators) {
      // Skip if already scheduled
      if (generatorName in cachedGenerators) {
        continue;
      }

      const { dependsOn, generate } = allGenerators[generatorName];

      // Ensure dependency is scheduled (but don't await its result yet)
      if (dependsOn && !(dependsOn in cachedGenerators)) {
        await runGenerators({ ...options, generators: [dependsOn] });
      }

      // Create a ParallelWorker for this generator
      const worker = createParallelWorker(generatorName, chunkPool, options);

      /**
       * Schedule the generator - it awaits its dependency internally
       * his allows multiple generators with the same dependency to run in parallel
       */
      const scheduledGenerator = async () => {
        const input = await cachedGenerators[dependsOn];

        return generate(input, { ...options, worker });
      };

      cachedGenerators[generatorName] = scheduledGenerator();
    }

    // Returns the value of the last generator of the current pipeline
    return cachedGenerators[generators[generators.length - 1]];
  };

  return { runGenerators };
};

export default createGenerator;
