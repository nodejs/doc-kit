---
'@doc-kit/generator-react': patch
---

Resolve the React→Preact aliases to absolute paths and anchor package imports
in generated virtual modules to the generator's own dependencies, so builds
work under isolated installs (pnpm) that don't hoist Preact and the UI
component packages to the project root.
