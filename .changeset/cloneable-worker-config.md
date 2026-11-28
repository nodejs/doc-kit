---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Leave values that can't be cloned, such as functions, out of the configuration sent to worker threads. A configured `html.bundler`, the Vite adapter included, no longer needs `threads: 1`.
