export type Generator = GeneratorMetadata<{
  templatePath: string;
}>;

export type Implementation = GeneratorImpl<
  Generate<Array<ApiDocMetadataEntry>, Promise<string>>
>;
