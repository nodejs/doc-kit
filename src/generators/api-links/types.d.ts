export interface ProgramExports {
  ctors: Array<string>;
  identifiers: Array<string>;
  indirects: Record<string, string>;
}

export type Generator = GeneratorMetadata<
  {},
  Generate<undefined, Promise<Record<string, string>>>
>;
