export type Generator = GeneratorMetadata<{}>;

export type Implementation = GeneratorImpl<
  Generate<Array<ApiDocMetadataEntry>, Promise<Array<ApiDocMetadataEntry>>>
>;
