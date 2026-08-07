---
'@node-core/doc-kit': major
'@doc-kit/core': major
---

The Node.js-specific generators (`api-links`, `addon-verify`, and
`man-page`) now live in the `@node-core/doc-kit` package and are loaded
via import specifiers such as `@node-core/doc-kit/man-page`. The
corresponding package exports have been removed from the doc-kit engine.
The CLI shorthand names are unchanged.
