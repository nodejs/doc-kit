---
'@doc-kit/core': patch
---

Point "edit this page" links at the `main` branch instead of the git ref. GitHub can't edit files at `HEAD` or a tag, so those links returned a 404.
