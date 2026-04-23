import type { MetadataEntry } from '@doc-kittens/internal/src/generators/metadata/types';
import type { JSXContent } from '../../utils/jsx-ast/content.mjs';

export type Generator = GeneratorMetadata<
  {
    pageURL: string;
    editURL: string;
  },
  Generate<Array<MetadataEntry>, AsyncGenerator<JSXContent>>,
  ProcessChunk<
    { head: MetadataEntry; entries: Array<MetadataEntry> },
    JSXContent,
    Array<[string, string]>
  >
>;
