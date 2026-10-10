---
'@doc-kit/core': major
'@doc-kit/cli': major
'@node-core/doc-kit-legacy': major
---

Remove the `legacy-html` and `legacy-html-all` generators, now that Node.js builds its API docs with the redesigned `html` generator. The `shiki.config.mjs` export of `@doc-kit/core`, which only they used, is removed too
