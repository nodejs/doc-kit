import { MetadataEntry } from '@doc-kit/core/generators/metadata/types';

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
    pageURL: string;
    /** Write each page's Markdown at `{path}.md` */
    writeMarkdown: boolean;
    /** Write llms-full.txt, holding every page's Markdown */
    writeFull: boolean;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
