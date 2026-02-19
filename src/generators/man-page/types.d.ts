export type Generator = GeneratorMetadata<{
  fileName: string;
  cliOptionsHeaderSlug: string;
  envVarsHeaderSlug: string;
  templatePath: string;
}>;

export type Implementation = GeneratorImpl<
  Generate<Array<ApiDocMetadataEntry>, Promise<string>>
>;
