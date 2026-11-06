---
'@doc-kit/core': minor
'@doc-kit/cli': patch
---

`runGenerators(configuration, { results: false })` keeps none of the requested generators' output: each still runs to its end, and once nothing else reads its output, its chunks go as they are recorded. The CLI's `generate` and `preview` commands use it, as they don't read the results.
