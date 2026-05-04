import type { JSXContent } from '../jsx-ast/utils/buildContent.mjs';

export type Configuration = {
  templatePath: string;
  title: string;
  useAbsoluteURLs: boolean;
  generateAllPage: boolean;
  generateIndexPage: boolean;
  generateNotFoundPage: boolean;
  imports: Record<string, string>;
  virtualImports: Record<string, string>;
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<JSXContent>, Promise<Array<{ html: string; css: string }>>>
>;
