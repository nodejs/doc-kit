---
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
'@node-core/doc-kit-legacy': minor
---

Builds take about half the memory and a third of the time (measured on the Node.js API docs): Shiki registers each language once code in it is highlighted, highlighted code reaches pages as static markup rather than a tree per token, `all.html` is rendered by the worker pool, output is no longer minified by default (serve it compressed instead), idle workers end after 250ms, and each worker's heap is limited to 512MB, which Node.js's `--max-old-space-size` raises.
