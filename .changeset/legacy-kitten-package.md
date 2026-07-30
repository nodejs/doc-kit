---
'@nodejs/doc-kit-generator-legacy': major
'@node-core/doc-kit': major
---

The legacy-format generators (`legacy-html`, `legacy-html-all`,
`legacy-json`, and `legacy-json-all`) now live in the new
`@nodejs/doc-kit-generator-legacy` package and are loaded via import specifiers such
as `@nodejs/doc-kit-generator-legacy/legacy-html`. The corresponding
`@node-core/doc-kit/*` package exports have been removed. The CLI shorthand
names are unchanged.
