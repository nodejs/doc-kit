import type { MetadataEntry } from '@doc-kit/core/generators/metadata/types';

export type Configuration = {
  // Headings deeper than this never start a chunk of their own
  maxDepth: number;
  // Modules (by `api` name) that are never split
  exclude: Array<string>;
};

/**
 * A group of consecutive metadata entries that become one chunk page, headed
 * by the entry whose heading starts the section.
 */
export type Chunk = {
  head: MetadataEntry;
  // The original depth of the chunk's heading
  depth: number;
  entries: Array<MetadataEntry>;
  // The chunk's unique file name within its module, once assigned
  name?: string;
  // The chunk page's path (`/fs/readFile`), once assigned
  path?: string;
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<MetadataEntry>, Promise<Array<MetadataEntry>>>
>;
