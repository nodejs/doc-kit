---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Fall back to `main` in "edit this page" links when the git ref isn't a branch (`HEAD`, a commit SHA or a tag). GitHub can only edit files on a branch, so those links returned a 404.
