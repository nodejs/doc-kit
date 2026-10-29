---
'@node-core/doc-kit-legacy': patch
'@node-core/doc-kit': patch
'@doc-kit/generator-react': patch
---

Fix template value replacement treating `$` sequences (such as `$$` in Makefile snippets) as special replacement patterns, which corrupted the rendered output.
