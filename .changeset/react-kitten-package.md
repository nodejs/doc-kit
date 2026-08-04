---
'@nodejs/doc-kit-generator-react': minor
'@node-core/doc-kit': major
---

The React/JSX-based generators (`html` — previously `web` —, `jsx-ast`,
`llms-txt`, `sitemap`, and `orama-db`) now live in the new
`@nodejs/doc-kit-generator-react` package and are loaded via import specifiers such as
`@nodejs/doc-kit-generator-react/html`. The corresponding `@node-core/doc-kit/*`
package exports have been removed. The `web` generator is renamed to `html`:
the CLI shorthand `web` keeps working as a deprecated alias, but the
configuration key is now `html` instead of `web`.
