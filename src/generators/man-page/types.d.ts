export type Generator = GeneratorMetadata<
  {
    fileName: string;
    cliOptionsHeaderSlug: string;
    envVarsHeaderSlug: string;
    templatePath: string;
  },
  Generate<Array<ApiDocMetadataEntry>, Promise<string>>
>;
