---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Omit `bundler` from the configuration sent to worker threads so a custom HTML
bundler adapter (including `createViteBundler(...)`) no longer throws
`DataCloneError` when builds use more than one thread.
