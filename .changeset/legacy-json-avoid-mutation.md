---
'@node-core/doc-kit': patch
---

Avoids directly mutating the AST in `legacy-json`, as to ensure future generators do not run with a input different than they expect.
