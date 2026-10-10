import { MetadataEntry } from '@doc-kit/core/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {
    pageURL: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
