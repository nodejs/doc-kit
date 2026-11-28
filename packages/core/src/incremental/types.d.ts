// Files by the key that produced them, relative to the output directory
// (POSIX, no leading slash). The key is an item's hash, or a label for files
// that don't belong to an item
export type Outputs = Record<string, Array<string>>;

// The manifest at `<output>/.doc-kit/manifest.json`
export type Manifest = {
  schema: number;
  // Set while a build is running, to detect one that did not finish
  building?: true;
  generators: Record<string, Outputs>;
};

// Strings and bytes are hashed as they are, other values as JSON. In that
// JSON, a result of `reuse` is replaced by the key it was stored under
export type KeyPart = unknown;

export type KeyOptions<T> = {
  // Overrides the generator's declared `key`
  key?: (item: T) => KeyPart | Array<KeyPart>;
};

export type PartitionOptions<T> = KeyOptions<T> & {
  // The file or files an item is written to, relative to the output directory
  files: (item: T) => string | Array<string>;
};

export type Partition<T> = {
  // Items whose files the previous build wrote from the same key
  fresh: Array<T>;
  // Items to write again
  stale: Array<T>;
};

export type ReuseOptions<T, R> = KeyOptions<T> & {
  // For a generator that already writes each result to its own file: the
  // file, relative to the output directory. The result is then read from it
  // with `read` instead of being stored twice
  file?: (item: T) => string;
  read?: (path: string) => Promise<R>;
};

// A generator's section of the incremental state
export type IncrementalSection = {
  // Yields one result per item, in order. Results the previous build stored
  // under the same key are loaded; `make` receives only the other items, and
  // must yield one result for each, in order. New results are stored under
  // `<output>/.doc-kit` for the next build
  reuse<T, R>(
    items: Array<T> | AsyncIterable<Array<T>>,
    make: (stale: AsyncIterable<Array<T>>) => AsyncIterable<Array<R>>,
    options?: ReuseOptions<T, R>
  ): AsyncIterable<Array<R>>;
  // For a generator that only writes files: splits the items by whether the
  // previous build wrote their files from the same key
  partition<T>(items: Array<T>, options: PartitionOptions<T>): Partition<T>;
  // Tracks files that don't belong to an item, such as assets
  record(label: string, ...files: Array<string>): void;
  // Hashes values computed at run time into every key. Must be called before
  // the first `reuse` or `partition`; `compute` only runs when enabled
  salt(compute: () => Array<KeyPart> | Promise<Array<KeyPart>>): Promise<void>;
  // Hashes values into a string a `key` function can return later
  digest(...parts: Array<KeyPart>): string;
};

// A generator's `incremental` property
export type IncrementalOptions<I = any> = {
  // Configuration keys that don't affect the output, excluded from the salt
  omit?: Array<string>;
  // Extra values for the salt
  salt?: Array<KeyPart>;
  // What to hash for an item. Defaults to the item itself
  key?: (item: I) => KeyPart | Array<KeyPart>;
};

export type IncrementalGenerator = Pick<
  GeneratorMetadata<any, any>,
  'name' | 'incremental'
>;

// The incremental state for a run: one manifest per output directory
export type IncrementalStore = {
  section(
    generator: IncrementalGenerator,
    config: Record<string, unknown> | undefined
  ): Promise<IncrementalSection>;
  // Removes what this run did not use, and saves the manifests
  save(): Promise<void>;
};
