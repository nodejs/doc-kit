import type { ApiDocReleaseEntry } from '../types';
import type { publicGenerators } from './index.mjs';

declare global {
  // All available generators as an inferable type, to allow Generator interfaces
  // to be type complete and runtime friendly within `runGenerators`
  export type AvailableGenerators = typeof publicGenerators;

  // ParallelWorker interface for item-level parallelization using real worker threads
  export interface ParallelWorker {
    /**
     * Process items in parallel using real worker threads.
     * Items are split into chunks, each chunk processed by a separate worker.
     *
     * @param items - Items to process (used to determine indices)
     * @param fullInput - Full input data for context rebuilding in workers
     * @param opts - Additional options to pass to workers
     * @returns Results in same order as input items
     */
    map<T, R>(
      items: T[],
      fullInput: unknown,
      opts?: Record<string, unknown>
    ): Promise<R[]>;
  }

  // This is the runtime config passed to the API doc generators
  export interface GeneratorOptions {
    // The path to the input source files. This parameter accepts globs and can
    // be a glob when passed to a generator.
    input: string | string[];

    // The path used to output generated files, this is to be considered
    // the base path that any generator will use for generating files
    // This parameter accepts globs but when passed to generators will contain
    // the already resolved absolute path to the output folder
    output: string;

    // A list of generators to be used in the API doc generation process;
    // This is considered a "sorted" list of generators, in the sense that
    // if the last entry of this list contains a generated value, we will return
    // the value of the last generator in the list, if any.
    generators: Array<keyof AvailableGenerators>;

    // Target Node.js version for the generation of the API docs
    version: SemVer;

    // A list of all Node.js major versions and their respective release information
    releases: Array<ApiDocReleaseEntry>;

    // A list of all the titles of all the documentation files
    index: Array<{ section: string; api: string }>;

    // An URL containing a git ref URL pointing to the commit or ref that was used
    // to generate the API docs. This is used to link to the source code of the
    // i.e. https://github.com/nodejs/node/tree/2cb1d07e0f6d9456438016bab7db4688ab354fd2
    // i.e. https://gitlab.com/someone/node/tree/HEAD
    gitRef: string;

    // The number of threads the process is allowed to use
    threads: number;

    // Number of items to process per worker thread
    chunkSize: number;

    // The type map
    typeMap: Record<string, string>;

    // Parallel worker instance for generators to parallelize work on individual items
    worker: ParallelWorker;
  }

  export interface GeneratorMetadata<I extends any, O extends any> {
    // The name of the Generator. Must match the Key in the AvailableGenerators
    name: keyof AvailableGenerators;

    version: string;

    description: string;

    /**
     * The immediate generator that this generator depends on.
     * For example, the `html` generator depends on the `react` generator.
     *
     * If a given generator has no "before" generator, it will be considered a top-level
     * generator, and run in parallel.
     *
     * Assume you pass to the `createGenerator`: ['json', 'html'] as the generators,
     * this means both the 'json' and the 'html' generators will be executed and generate their
     * own outputs in parallel. If the 'html' generator depends on the 'react' generator, then
     * the 'react' generator will be executed first, then the 'html' generator.
     *
     * But both 'json' and 'html' generators will be executed in parallel.
     *
     * If you pass `createGenerator` with ['react', 'html'], the 'react' generator will be executed first,
     * as it is a top level generator and then the 'html' generator would be executed after the 'react' generator.
     *
     * The 'ast' generator is the top-level parser, and if 'ast' is passed to `dependsOn`, then the generator
     * will be marked as a top-level generator.
     *
     * The `ast-js` generator is the top-level parser for JavaScript files. It
     * passes the ASTs for any JavaScript files given in the input. Like `ast`,
     * any generator depending on it is marked as a top-level generator.
     */
    dependsOn: keyof AvailableGenerators | 'ast' | 'ast-js';

    /**
     * Generators are abstract and the different generators have different sort of inputs and outputs.
     * For example, a MDX generator would take the raw AST and output MDX with React Components;
     * Whereas a JSON generator would take the raw AST and output JSON;
     * Then a React generator could receive either the raw AST or the MDX output and output React Components.
     * (depending if they support such I/O)
     *
     * Hence you can combine different generators to achieve different outputs.
     */
    generate: (input: I, options: Partial<GeneratorOptions>) => Promise<O>;

    /**
     * Optional method for chunk-level parallelization using real worker threads.
     * Called by chunk-worker.mjs when processing items in parallel.
     *
     * Generators that implement this method can have their work distributed
     * across multiple worker threads for true parallel processing.
     *
     * @param fullInput - Full input data (for rebuilding context in workers)
     * @param itemIndices - Array of indices of items to process
     * @param options - Generator options (without worker, which isn't serializable)
     * @returns Array of results for the processed items
     */
    processChunk?: (
      fullInput: I,
      itemIndices: number[],
      options: Partial<Omit<GeneratorOptions, 'worker'>>
    ) => Promise<unknown[]>;
  }
}
