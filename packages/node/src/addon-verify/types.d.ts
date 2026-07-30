import type { MetadataEntry } from '@nodejs/doc-kit/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<MetadataEntry>, Promise<Record<string, string>>>
>;
