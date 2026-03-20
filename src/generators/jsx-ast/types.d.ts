import type { MetadataEntry } from '../metadata/types';
import type { JSXContent } from './utils/buildContent.mjs';

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<MetadataEntry>, AsyncGenerator<JSXContent>>,
  ProcessChunk<
    { head: MetadataEntry; entries: Array<MetadataEntry> },
    JSXContent,
    Array<[string, string]>
  >
>;
