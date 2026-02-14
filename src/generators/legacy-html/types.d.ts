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
    additionalPathsToCopy: Array<string>;
  },
  Generate<Array<ApiDocMetadataEntry>, AsyncGenerator<TemplateValues>>,
  ProcessChunk<
    {
      head: ApiDocMetadataEntry;
      nodes: Array<ApiDocMetadataEntry>;
      headNodes: Array<ApiDocMetadataEntry>;
    },
    TemplateValues,
    string
  >
>;
