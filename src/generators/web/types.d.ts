import type { JSXContent } from '../jsx-ast/utils/buildContent.mjs';

export type Configuration = {
  templatePath: string;
  title: string;
  useAbsoluteURLs: boolean;
  imports: Record<string, string>;
  virtualImports: Record<string, string>;
};

export type Generator = GeneratorMetadata<
  Configuration,
  Generate<Array<JSXContent>, AsyncGenerator<{ html: string; css: string }>>
>;
