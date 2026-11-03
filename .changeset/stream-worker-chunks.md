---
'@doc-kit/core': minor
---

`worker.stream` accepts an async iterable of batches, starting each one's work as it arrives, as well as an array. It keeps only a few chunks per thread in flight, so generators running at once share the worker pool, starts them in the order they were submitted and yields their results in that order. `toBatches`, from `@doc-kit/core/utils/generators.mjs`, gives an input that is either whole or streamed as batches.
