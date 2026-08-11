---
'@doc-kit/core': patch
'@doc-kit/generator-react': patch
---

Fix empty paragraphs in API docs when a typed parameter list contains trailing non-parameter items

When a loose markdown list in the API docs starts with typed parameters (e.g. `actual`, `expected`, `Returns`) but also contains plain prose bullets (e.g. algorithm complexity notes), the entire list was previously treated as a parameter signature table. The non-parameter items had no name or type, causing them to render as empty `<section>` blocks on the built site.

The fix splits the list at the first non-parameter item: typed items become the `FunctionSignature` table, and the remaining items render as regular markdown content.
