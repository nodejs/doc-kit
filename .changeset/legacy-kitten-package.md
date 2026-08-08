---
'@node-core/doc-kit-legacy': major
'@doc-kit/core': major
---

The legacy-format generators (`legacy-html`, `legacy-html-all`,
`legacy-json`, and `legacy-json-all`) now live in the new
`@node-core/doc-kit-legacy` package and are loaded via import specifiers such
as `@node-core/doc-kit-legacy/legacy-html`. The corresponding
`@doc-kit/core/*` package exports have been removed. The CLI shorthand
names are unchanged.
