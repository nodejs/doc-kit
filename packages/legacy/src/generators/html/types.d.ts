import {
  GeneratorMetadata,
  ProcessChunk,
  Generate,
} from '#core/generators/types';
import { MetadataEntry } from '@doc-kittens/internal/src/generators/metadata/types';

export interface TemplateValues {
  api: string;
  added: string;
  section: string;
  toc: string;
  nav: string;
  content: string;
}

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
    pageURL: string;
    editURL: string;
    additionalPathsToCopy: Array<string>;
  },
  Generate<Array<MetadataEntry>, AsyncGenerator<TemplateValues>>,
  ProcessChunk<
    {
      head: MetadataEntry;
      nodes: Array<MetadataEntry>;
      headNodes: Array<MetadataEntry>;
    },
    TemplateValues,
    string
  >
>;
