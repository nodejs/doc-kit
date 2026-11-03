---
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
---

`metadata` and `section-pages` stream their input: with more than one thread, they start on their dependency's first chunk, so parsing, metadata and section pages overlap. The generated files are unchanged. `groupWholeModules`, from `@doc-kit/core/utils/generators.mjs`, regroups streamed entries so that each batch holds whole modules.
