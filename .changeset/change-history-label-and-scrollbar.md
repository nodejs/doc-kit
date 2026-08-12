---
'@doc-kit/generator-react': patch
---

Fix `[object Object]` in ChangeHistory aria-label and dropdown horizontal scrollbar

- Change history labels were passing a JSX AST object instead of a plain text
  string to the `ChangeHistory` component, causing `aria-label` to render as
  `[object Object]`. Labels are now extracted as plain text via `remark-parse`.
- The ChangeHistory dropdown could show a horizontal scrollbar when label text
  overflowed the fixed-width container. Added `overflow-wrap` and `word-break`
  rules to prevent this.
