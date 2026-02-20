export type Generator = GeneratorMetadata<
  {
    templatePath: string;
  },
  Generate<Array<ApiDocMetadataEntry>, Promise<string>>
>;
