---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Builds use less memory, most of all with few threads: each worker's young generation is limited to 32MB, a single thread processes one chunk at a time and lets go of the pages' code before rendering them, and Vite's native bundler gets as many threads as doc-kit and returns the memory it frees. On the Node.js API docs, `--threads 1` now builds with Node.js's `--max-old-space-size=512`.
