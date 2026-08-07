export interface SnapshotFile {
  /** Absolute path on disk */
  abs: string;
  /** Path relative to the pattern's glob parent (relocatable) */
  rel: string;
  /** Content hash */
  hash: string;
}

export interface Snapshot {
  files: SnapshotFile[];
  /** Hash of the sorted rel:hash lines — covers file set and contents */
  digest: string;
}

export interface Store {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): void;
  /** Existence check that refreshes the object's mtime (prune protection) */
  touch(key: string): Promise<boolean>;
  memo(
    namespace: string,
    key: string,
    produce: () => Promise<string> | string
  ): Promise<string>;
  flush(): Promise<void>;
  prune(maxAgeDays: number): Promise<void>;
}

export interface OutputRecord {
  hash: string;
  size: number;
}

export interface Profile {
  completedAt: number;
  /** Aggregate key per resolved target specifier */
  targets: Record<string, string>;
  /** Files the profile's last complete run wrote, relative to the output dir */
  outputs: Record<string, OutputRecord>;
  complete: boolean;
}

export interface Manifest {
  schema: number;
  profiles: Record<string, Profile>;
}

export interface CacheConfiguration {
  enabled?: boolean;
  /** No cache reads this run; results are still written (repopulate) */
  force?: boolean;
  dir?: string;
  maxAgeDays?: number;
}

export interface BuildCache {
  store: Store;
  dir: string;
  /** Chain salt for per-item leaf-cache keys (code + config, no inputs) */
  chainSalt(specifier: string): string;
  /** Content hash of the source file behind a module path (`/fs`), if known */
  sourceHash(modulePath: string): Promise<string | undefined>;
  /** Records an output file write (tracked writeFile / vite / copies) */
  recordOutput(absPath: string, content: Buffer | string): void;
  /** Tracked write: records, skips byte-identical writes */
  writeTracked(file: string, data: unknown, rest: unknown[]): Promise<void>;
  /** Flushes writes, persists the profile, prunes, reports stats */
  finalize(success: boolean): Promise<void>;
}
