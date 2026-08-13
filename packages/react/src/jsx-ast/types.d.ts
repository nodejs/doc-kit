import type { MetadataEntry } from '@doc-kit/core/generators/metadata/types';
import type { JSXContent } from './utils/buildContent.mjs';

export type Generator = GeneratorMetadata<
  {
    ref: string;
    generateAllPage: boolean;
    generateNotFoundPage: boolean;
  },
  Generate<Array<MetadataEntry>, AsyncGenerator<JSXContent>>,
  ProcessChunk<
    { head: MetadataEntry; entries: Array<MetadataEntry> },
    JSXContent
  >
>;
