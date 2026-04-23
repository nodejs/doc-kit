import type { MetadataEntry } from '@doc-kittens/internal/src/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<MetadataEntry>, Promise<Record<string, string>>>
>;
