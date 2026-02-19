export type Generator = GeneratorMetadata<{}>;

export type Implementation = GeneratorImpl<
  Generate<Array<ApiDocMetadataEntry>, Promise<Record<string, string>>>
>;
