---
'@nodejs/doc-kit': patch
---

Resolve unions and arrays of display-name types (`{HTTP/2 Headers Object | vm.Module}`, `{HTTP/2 Headers Object[]}`), and stop capturing prose such as `U+007B ({), and U+007D (}).` as a type annotation.
