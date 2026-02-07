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

  export interface ParallelTaskOptions {
    generatorName: keyof AllGenerators;
    input: unknown[];
    itemIndices: number[];
  }

  /**
   * Type for the generate function of a generator
   * @template I - Input type
   * @template O - Output type (can be AsyncGenerator or Promise)
   */
  export type Generate<I, O> = (
    input: I,
    worker: ParallelWorker
  ) => O extends AsyncGenerator ? O : Promise<O>;

  /**
   * Type for the optional processChunk function of a generator
   * @template I - Input type
   * @template O - Output type
   * @template D - Dependencies type
   */
  export type ProcessChunk<I, O, D = {}> = (
    slicedInput: I[],
    itemIndices: number[],
    dependencies: D
  ) => Promise<O>;

  export type GeneratorMetadata<
    C extends any,
    G extends Generate<any, any>,
    P extends ProcessChunk<any, any, any> | undefined = undefined,
  > = {
    readonly defaultConfiguration: C;

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
    generate: G;

    /**
     * Optional method for chunk-level parallelization using real worker threads.
     * Called by chunk-worker.mjs when processing items in parallel.
     *
     * Generators that implement this method can have their work distributed
     * across multiple worker threads for true parallel processing.
     *
     * Input is automatically sliced to only include items at the specified indices,
     * reducing serialization overhead. The itemIndices are remapped to 0-based
     * indices into the sliced array.
     *
     * @param slicedInput - Sliced input containing only items for this chunk
     * @param itemIndices - Array of 0-based indices into slicedInput
     * @param dependencies - Generator options (without worker, which isn't serializable)
     * @returns Array of results for the processed items
     */
    processChunk?: P;
  };
}
