import type { Document } from '../json/generated/schema';

/**
 * Every document of a documentation set, in index order.
 */
export interface Bundle {
  /** The URL of the schema the bundle conforms to */
  $schema: string;
  documents: Array<Document>;
}

export interface Configuration {
  /** Where the schema is published; `{schemaVersion}` is filled in */
  schemaURL: string;
}

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<Document>, Promise<Bundle>>
>;
