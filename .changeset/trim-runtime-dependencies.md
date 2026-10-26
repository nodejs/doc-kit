---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Install fewer packages: `@doc-kit/core` updates `cosmiconfig` to v10 (TypeScript config files now load through Node's type stripping) and no longer installs `dedent`, and `@doc-kit/generator-react` estimates reading time with `Intl.Segmenter` instead of the `reading-time` package and updates `@node-core/ui-components` to 1.8.1, which no longer installs `@vcarl/remark-headings`.
