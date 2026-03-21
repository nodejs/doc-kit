import type { MetadataEntry } from '../metadata/types';

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<MetadataEntry>, Promise<Record<string, string>>>
>;
