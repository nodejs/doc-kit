declare global {
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
     * @param opts - Additional options to pass to workers
     * @yields Each chunk's results as they complete
     */
    stream<T, R>(
      items: T[],
      opts?: Record<string, unknown>
    ): AsyncGenerator<R[], void, unknown>;
  }

  export interface ParallelTaskOptions {
    generatorSpecifier: string;
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
    readonly defaultConfiguration?: C;

    // The name of the Generator
    name: string;

    /**
     * The import specifier of the generator this one depends on.
     * For example, '@node-core/doc-kit/generators/metadata'.
     *
     * If undefined, this is a top-level generator with no dependencies.
     */
    dependsOn?: string;

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
