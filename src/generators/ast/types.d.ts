import type { Root } from 'mdast';

export type Generator = GeneratorMetadata<{}>;

export type Implementation = GeneratorImpl<
  Generate<undefined, AsyncGenerator<ParserOutput<Root>>>,
  ProcessChunk<string, ParserOutput<Root>>
>;
