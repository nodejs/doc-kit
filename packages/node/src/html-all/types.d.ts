import type { PageCode } from '@doc-kit/generator-react/jsx-ast/types';

type Pages = Array<PageCode | { manifest: Array<PageCode['data']> }>;

export type Generator = GeneratorMetadata<
  {},
  Generate<Pages | AsyncIterable<Pages>, AsyncGenerator<Pages>>
>;
