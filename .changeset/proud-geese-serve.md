---
'@doc-kit/cli': minor
'@doc-kit/core': patch
---

Add a `doc-kit preview` command that serves the generated docs locally, building first when any `generate` option is passed. The default output directory (`./out`) is now defined in the shared configuration, so `generate` also writes there when no `--output` is given.
