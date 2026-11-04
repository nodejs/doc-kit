---
'@doc-kit/core': minor
---

`worker.stream` accepts an async iterable of batches as well as an array, starting a batch's work while earlier ones still run and reading the next batch once there is room for it. It keeps only a few chunks per thread in flight, so generators running at once share the worker pool, starts them in the order they were submitted and yields their results in that order.
