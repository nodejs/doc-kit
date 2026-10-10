---
'@doc-kit/cli': minor
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
'@node-core/doc-kit-legacy': patch
---

Build with 30–50% less memory, in less than half the time: Shiki registers each language once code in it is highlighted, highlighted code reaches pages as static markup rather than a tree per token, the default Vite bundler runs in a child process (`createChildProcess`), `all.html` is rendered by the worker pool and no longer minified, idle workers end after 500ms, and each worker's heap is limited to 512MB by default (the new `workerHeapSize` option, or `--worker-heap-size`)
