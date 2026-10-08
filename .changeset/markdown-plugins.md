---
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
'@node-core/doc-kit-legacy': patch
---

Add a `markdown` option to add remark, rehype, and recma plugins to the generators processing Markdown, or configure the ones they use, such as Shiki. The `@doc-kit/core` modules the generators' pipelines replace are removed (`utils/remark.mjs`, `utils/remark-shiki.mjs`, and `utils/highlighter.mjs`), and `utils/type-annotations` moves to `plugins/type-annotations`
