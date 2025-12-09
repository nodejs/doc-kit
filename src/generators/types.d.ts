import type { ApiDocReleaseEntry } from '../types';
import type { publicGenerators, allGenerators } from './index.mjs';

declare global {
  // Public generators exposed to the CLI
  export type AvailableGenerators = typeof publicGenerators;

  // All generators including internal ones (metadata, jsx-ast, ast-js)
  export type AllGenerators = typeof allGenerators;

  /**
   * ParallelWorker interface for distributing work across Node.js worker threads.
   * Streams results as chunks complete, enabling pipeline parallelism.
   */
  export interface ParallelWorker {
    /**
     * Processes items in parallel across worker threads and yields results
     * as each chunk completes. Enables downstream processing to begin
     * while upstream chunks are still being processed.
     *
     * @param items - Items to process (determines chunk distribution)
     * @param fullInput - Full input data for context rebuilding in workers
     * @param opts - Additional options to pass to workers
     * @yields Each chunk's results as they complete
     */
    stream<T, R>(
      items: T[],
      fullInput: T[],
      opts?: Record<string, unknown>
    ): AsyncGenerator<R[], void, unknown>;
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
    // The name of the Generator. Must match the Key in AllGenerators
    name: keyof AllGenerators;

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
     * The 'ast' generator is the top-level parser for markdown files. It has no dependencies.
     *
     * The `ast-js` generator is the top-level parser for JavaScript files. It
     * passes the ASTs for any JavaScript files given in the input.
     */
    dependsOn: keyof AllGenerators | undefined;

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
    processChunk?: ((
      fullInput: I,
      itemIndices: number[],
      options: Partial<Omit<GeneratorOptions, 'worker'>>
    ) => Promise<unknown[]>) & {
      /**
       * When true, only the items at the specified indices are sent to workers
       * instead of the full input array. This reduces serialization overhead
       * for generators that don't need full context to process individual items.
       *
       * Set this to true when processChunk only accesses `fullInput[idx]` for
       * each index in itemIndices, and doesn't need the full array for context.
       */
      sliceInput?: boolean;
    };
  }
}
