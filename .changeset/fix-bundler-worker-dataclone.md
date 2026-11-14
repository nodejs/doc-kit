---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Exclude main-thread-only bundler options from worker thread configuration to prevent DataCloneError.
