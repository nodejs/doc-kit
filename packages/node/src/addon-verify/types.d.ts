import type { MetadataEntry } from '@doc-kit/core/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<MetadataEntry>, Promise<Record<string, string>>>
>;
