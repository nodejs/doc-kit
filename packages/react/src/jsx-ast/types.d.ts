import type { MetadataEntry } from '@node-core/doc-kit/generators/metadata/types';
import type { JSXContent } from './utils/buildContent.mjs';

export type Generator = GeneratorMetadata<
  {
    ref: string;
    generateAllPage: boolean;
    generateIndexPage: boolean;
    generateNotFoundPage: boolean;
  },
  Generate<Array<MetadataEntry>, AsyncGenerator<JSXContent>>,
  ProcessChunk<
    { head: MetadataEntry; entries: Array<MetadataEntry> },
    JSXContent
  >
>;
