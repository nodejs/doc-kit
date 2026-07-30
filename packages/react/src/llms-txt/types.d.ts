import { MetadataEntry } from '@node-core/doc-kit/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
    pageURL: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
