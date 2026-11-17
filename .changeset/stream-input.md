---
'@doc-kit/core': minor
---

Generators can set `streamsInput: true` to receive their dependency's output as an async iterable of chunks as they are produced, instead of waiting for all of it. With one thread, the input is collected first and arrives as its only chunk. The cache runs a streamed generator once for every reader, and lets a chunk go once all of them have read it.
