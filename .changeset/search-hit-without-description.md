---
'@doc-kit/generator-react': patch
---

Fix the search modal crashing with `Cannot read properties of undefined (reading 'split')` when a hit has no description, such as headings without a leading paragraph in the generated `orama-db.json` index.
