import type { MetadataEntry } from '../metadata/types';

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
