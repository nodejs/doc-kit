import type { Root } from 'mdast';

export type Generator = GeneratorMetadata<{
  typeMap: string | URL;
}>;

export type Implementation = GeneratorImpl<
  Generate<Array<Root>, AsyncGenerator<ApiDocMetadataEntry>>,
  ProcessChunk<Root, ApiDocMetadataEntry, Record<string, string>>
>;
