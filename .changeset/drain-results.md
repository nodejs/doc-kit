---
'@doc-kit/core': minor
'@doc-kit/cli': patch
---

`runGenerators` with `discardResults: true` in its configuration keeps none of the requested generators' output: each still runs to its end, and once nothing else reads its output, its chunks go as they are produced. The CLI's `generate` and `preview` commands use it, as they don't read the results.
