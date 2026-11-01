---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Fix custom HTML bundler configurations failing with DataCloneError
during parallel page generation by excluding main-thread-only
bundler functions from worker messages.
