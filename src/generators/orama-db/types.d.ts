import type { Orama, RawData } from '@orama/orama';
import type { MetadataEntry } from '../metadata/types';

/**
 * Schema for the Orama database entry
 */
export interface OramaDbEntry {
  name: string;
  type: string;
  desc: string;
  stability: number;
  stabilityText: string;
  meta: {
    changes: string[];
    added: string[];
    napiVersion: string[];
    deprecated: string[];
    removed: string[];
  };
}

/**
 * Represents the Orama database for API docs
 */
export type OramaDb = Orama<OramaDbEntry>;

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<MetadataEntry>, Promise<RawData>>
>;
