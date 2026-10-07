---
'@doc-kit/core': major
'@doc-kit/cli': major
'@node-core/doc-kit-legacy': major
---

Remove the `legacy-html` and `legacy-html-all` generators, now that Node.js builds its API docs with the redesigned `html` generator. The `@doc-kit/core` exports only they used are removed too: `shiki.config.mjs`, `utils/remark-shiki.mjs`, and the default export of `utils/highlighter.mjs`
