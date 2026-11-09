export type ManifestSection = {
  // The files each item's key produced, relative to the output directory
  // (POSIX, no leading slash)
  outputs: Record<string, Array<string>>;
};

// The manifest at `<output>/.doc-kit/manifest.json`
export type Manifest = {
  schema: number;
  generators: Record<string, ManifestSection>;
};

export type KeyParts = string | Uint8Array | Array<string | Uint8Array>;

// A generator's view of the manifest for one run
export type IncrementalSection = {
  // What an item (or a label, for files that belong to no item) produced;
  // what is not recorded is pruned
  record(item: unknown, ...files: Array<string>): void;
  // Adds run-time parts to the salt; computed only when enabled, and only
  // before any key is derived
  salt(compute?: () => KeyParts[] | Promise<KeyParts[]>): Promise<void>;
  // Splits the items by whether the previous build made their files from the
  // same key, and records the stale ones' from `files`; `key` overrides the
  // declared one
  partition<T>(
    items: Array<T>,
    options?: {
      key?: (item: T) => KeyParts;
      files?: (item: T) => string | Array<string>;
    }
  ): { fresh: Array<T>; stale: Array<T> };
  prune(): Promise<void>;
};

// What a generator declares for its incremental builds
export type IncrementalOptions<I = any> = {
  // Configuration keys that do not shape the output, left out of the salt
  omit?: Array<string>;
  // Parts of the salt besides the configuration
  salt?: Array<string | Uint8Array>;
  // What an item's output is made from, hashed with the salt; the item's JSON
  // by default
  key?: (item: I) => KeyParts;
};

export type IncrementalGenerator = Pick<
  GeneratorMetadata<any, any>,
  'name' | 'incremental'
>;

// A run's manifests, one per output directory
export type IncrementalStore = {
  section(
    generator: IncrementalGenerator,
    config: Record<string, unknown> | undefined
  ): Promise<IncrementalSection>;
  save(): Promise<void>;
};
