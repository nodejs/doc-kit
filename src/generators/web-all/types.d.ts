import type { MetadataEntry } from '../metadata/types';

export type Configuration = {
  templatePath: string;
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<MetadataEntry>, Promise<{ html: Array<string>; css: string }>>
>;
