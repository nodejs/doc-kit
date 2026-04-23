import { MetadataEntry } from '@doc-kittens/internal/src/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
    pageURL: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
