import type { JSXContent } from '../jsx-ast/utils/buildContent.mjs';

export type Generator = GeneratorMetadata<{
  templatePath: string;
  title: string;
  imports: Record<string, string>;
}>;

export type Implementation = GeneratorImpl<
  Generate<Array<JSXContent>, AsyncGenerator<{ html: string; css: string }>>
>;
