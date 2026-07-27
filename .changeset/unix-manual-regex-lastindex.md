---
'@node-core/doc-kit': patch
---

Fix `isTextWithUnixManual` intermittently missing valid Unix manual page
references: the shared `unixManualPage` regex is global, so its `lastIndex`
persisted between `.test()` calls during tree traversal.
