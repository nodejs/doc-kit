export type Generator = GeneratorMetadata<{}>;

export type Implementation = GeneratorImpl<
  Generate<undefined, AsyncGenerator<JsProgram>>,
  ProcessChunk<string, JsProgram>
>;
