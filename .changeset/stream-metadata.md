---
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
---

`metadata` and `section-pages` stream their input: with more than one thread, they start on their dependency's first chunk, so parsing, metadata and section pages overlap. The generated files are unchanged. `toBatches`, from `@doc-kit/core/utils/generators.mjs`, gives an input that is whole or streamed as batches.
