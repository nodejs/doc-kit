import { MetadataEntry } from '../metadata/types';

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
