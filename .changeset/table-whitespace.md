---
'@doc-kit/generator-react': patch
---

Fix a crash when a table's rows and cells are surrounded by whitespace text nodes, as `rehype-raw` 9.1.1 and later keep them. The transformer now finds the header row and the cells themselves instead of assuming they are the first children, and labels cells by their column.
