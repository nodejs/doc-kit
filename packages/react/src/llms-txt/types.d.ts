import { MetadataEntry } from '@nodejs/doc-kit/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
    pageURL: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
