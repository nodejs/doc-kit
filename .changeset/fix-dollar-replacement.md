---
'@node-core/doc-kit-legacy': patch
'@node-core/doc-kit': patch
'@doc-kit/generator-react': patch
---

Fix `$$`, `$&`, `` $` `` and `$'` in page content being treated as `String.prototype.replace` replacement patterns instead of literal text. This affected the legacy HTML generator's page and navigation content, the man page generator's options/environment sections, and the sitemap generator's URL entries.
