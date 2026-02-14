import type { Root } from 'mdast';

export type Generator = GeneratorMetadata<
  {
    typeMap: string | URL;
  },
  Generate<Array<Root>, AsyncGenerator<ApiDocMetadataEntry>>,
  ProcessChunk<Root, ApiDocMetadataEntry, Record<string, string>>
>;
