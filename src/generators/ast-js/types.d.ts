export type Generator = GeneratorMetadata<
  {},
  Generate<undefined, AsyncGenerator<JsProgram>>,
  ProcessChunk<string, JsProgram>
>;
