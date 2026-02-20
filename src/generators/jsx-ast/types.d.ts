import type { JSXContent } from './utils/buildContent.mjs';

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<ApiDocMetadataEntry>, AsyncGenerator<JSXContent>>,
  ProcessChunk<
    { head: ApiDocMetadataEntry; entries: Array<ApiDocMetadataEntry> },
    JSXContent,
    Array<[string, string]>
  >
>;
