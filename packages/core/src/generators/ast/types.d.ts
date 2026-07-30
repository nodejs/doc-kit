import type { Root } from 'mdast';

export type Generator = GeneratorMetadata<
  {},
  Generate<undefined, AsyncGenerator<ParserOutput<Root>>>,
  ProcessChunk<string, ParserOutput<Root>>
>;
