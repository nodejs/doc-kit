import { MetadataEntry } from '@doc-kit/core/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
    pageURL: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
