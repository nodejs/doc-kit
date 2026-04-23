import { MetadataEntry } from '@doc-kittens/internal/src/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {
    fileName: string;
    cliOptionsHeaderSlug: string;
    envVarsHeaderSlug: string;
    templatePath: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
