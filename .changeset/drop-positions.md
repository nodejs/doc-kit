---
'@doc-kit/core': minor
---

The nodes of `metadata`'s entries no longer keep their `position` in the source once they are parsed, since nothing after `metadata` reads it. Builds hold less in memory and are faster, and the output of `json-simple` no longer has them either, now about a third of its size.
