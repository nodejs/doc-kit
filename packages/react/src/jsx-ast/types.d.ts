import type { MetadataEntry } from '@doc-kit/core/generators/metadata/types';
import type { PageContent } from './utils/buildContent.mjs';

// What the worker returns for a page: the fragment serialized to JSX code.
export type PageCode = Omit<PageContent, 'content'> & { content: string };

export type Generator = GeneratorMetadata<
  {
    ref: string;
    generateNotFoundPage: boolean;
    showReadingTime: boolean;
  },
  Generate<Array<MetadataEntry>, AsyncGenerator<PageCode>>,
  ProcessChunk<{ head: MetadataEntry; entries: Array<MetadataEntry> }, PageCode>
>;
