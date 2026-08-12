---
'@doc-kit/core': patch
---

Resolve generator packages from the invoking project's `node_modules` and the npm global root when they are not installed alongside core, so one-shot runs (`npx @doc-kit/cli`) find locally or globally installed generators
