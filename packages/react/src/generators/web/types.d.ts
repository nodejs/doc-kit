import type { JSXContent } from '../../utils/jsx-ast/content.mjs';

export type Generator = GeneratorMetadata<
  {
    templatePath: string;
    title: string;
    imports: Record<string, string>;
  },
  Generate<Array<JSXContent>, AsyncGenerator<{ html: string; css: string }>>
>;
