---
'@doc-kit/core': minor
---

Generators can start on their dependency's first chunk instead of waiting for all of it: with `streamsInput: true`, a generator receives its dependency's output as an async iterable of chunks (with one thread, still whole), which `worker.stream` accepts. The cache records a streamed generator once for all the generators reading it, each from the first chunk, and lets go of a chunk once every one of them has read it.
