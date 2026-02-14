export interface TemplateValues {
  api: string;
  added: string;
  section: string;
  version: string;
  toc: string;
  nav: string;
  content: string;
}

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
  },
  Generate<Array<string>, Promise<string>>
>;
