---
'@doc-kit/core': minor
---

`worker.stream` also accepts an async iterable of batches, starting each batch's chunks while earlier ones still run. It keeps only a few chunks per thread in flight so concurrent generators share the worker pool, and still yields results in submission order.
