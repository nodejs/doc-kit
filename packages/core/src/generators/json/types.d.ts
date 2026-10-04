import type { MetadataEntry } from '../metadata/types';
import type { Document } from './generated/schema';

export type * from './generated/schema';

/**
 * What a worker needs, besides the entries, to build a document.
 */
export interface Dependencies {
  /** The resolved `$schema` URL every document carries */
  schemaURL: string;
  /** The base URL source links resolve against, or `null` without a repository */
  sourceURL: string | null;
}

export interface Configuration {
  /** Where the schema is published */
  schemaURL: string;
}

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<MetadataEntry>, AsyncGenerator<Array<Document>>>,
  ProcessChunk<
    { head: MetadataEntry; entries: Array<MetadataEntry> },
    Array<Document>,
    Dependencies
  >
>;
