import type { PageCode } from '@doc-kit/generator-react/jsx-ast/types';

type Pages = Array<PageCode | { manifest: Array<PageCode['data']> }>;

export type Generator = GeneratorMetadata<
  {},
  Generate<AsyncIterable<Pages>, AsyncGenerator<Pages>>
>;
